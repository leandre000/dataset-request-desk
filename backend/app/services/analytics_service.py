"""Analytics service — database-level aggregation supporting PostgreSQL and SQLite."""

from datetime import date, datetime

from sqlalchemy import case, func, literal_column, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Assignment, Episode, Request, StatusHistory
from app.schemas import (
    AnalyticsResponse,
    EpisodesPerDayRobot,
    RequestsByStatus,
    TopTask,
)


async def get_analytics(
    db: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> AnalyticsResponse:
    """Build analytics response using database-level aggregation."""
    bind = db.bind or getattr(db.sync_session, "bind", None)
    dialect_name = bind.dialect.name if bind else "postgresql"
    is_sqlite = dialect_name == "sqlite"

    # 1. Episodes per day per robot
    if is_sqlite:
        day_expr = func.date(Episode.recorded_at).label("day")
    else:
        day_expr = func.date_trunc("day", Episode.recorded_at).label("day")

    epdr_query = (
        select(
            day_expr,
            Episode.robot_id,
            func.count(Episode.id).label("cnt"),
        )
        .group_by("day", Episode.robot_id)
        .order_by("day", Episode.robot_id)
    )

    if date_from:
        epdr_query = epdr_query.where(Episode.recorded_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        epdr_query = epdr_query.where(Episode.recorded_at <= datetime.combine(date_to, datetime.max.time()))

    epdr_result = await db.execute(epdr_query)
    episodes_per_day_robot = []
    for row in epdr_result.all():
        if hasattr(row.day, "strftime"):
            d_str = row.day.strftime("%Y-%m-%d")
        else:
            d_str = str(row.day) if row.day else ""
        episodes_per_day_robot.append(
            EpisodesPerDayRobot(date=d_str, robot_id=row.robot_id, count=row.cnt)
        )

    # 2. Requests by status
    rbs_query = select(
        Request.status,
        func.count(Request.id).label("cnt"),
    ).group_by(Request.status)

    rbs_result = await db.execute(rbs_query)
    requests_by_status = [
        RequestsByStatus(status=row.status, count=row.cnt) for row in rbs_result.all()
    ]

    # 3. Median delivery time (hours from submitted -> delivered)
    if is_sqlite:
        sqlite_durations = text("""
            SELECT (strftime('%s', delivered.changed_at) - strftime('%s', submitted.changed_at)) / 3600.0 AS duration_hours
            FROM (
                SELECT request_id, MIN(changed_at) AS changed_at
                FROM status_history
                WHERE new_status = 'submitted'
                GROUP BY request_id
            ) submitted
            JOIN (
                SELECT request_id, MIN(changed_at) AS changed_at
                FROM status_history
                WHERE new_status = 'delivered'
                GROUP BY request_id
            ) delivered ON submitted.request_id = delivered.request_id
            WHERE (strftime('%s', delivered.changed_at) - strftime('%s', submitted.changed_at)) >= 0
            ORDER BY duration_hours
        """)
        durations = (await db.execute(sqlite_durations)).scalars().all()
        if durations:
            mid = len(durations) // 2
            if len(durations) % 2 == 1:
                median_delivery_hours = round(float(durations[mid]), 1)
            else:
                median_delivery_hours = round(float((durations[mid - 1] + durations[mid]) / 2.0), 1)
        else:
            median_delivery_hours = None
    else:
        # PostgreSQL native PERCENTILE_CONT(0.5)
        median_query = text("""
            SELECT EXTRACT(EPOCH FROM PERCENTILE_CONT(0.5) WITHIN GROUP (
                ORDER BY delivered.changed_at - submitted.changed_at
            )) / 3600.0 AS median_hours
            FROM (
                SELECT request_id, MIN(changed_at) AS changed_at
                FROM status_history
                WHERE new_status = 'submitted'
                GROUP BY request_id
            ) submitted
            JOIN (
                SELECT request_id, MIN(changed_at) AS changed_at
                FROM status_history
                WHERE new_status = 'delivered'
                GROUP BY request_id
            ) delivered ON submitted.request_id = delivered.request_id
        """)
        median_result = await db.execute(median_query)
        median_row = median_result.first()
        median_delivery_hours = round(float(median_row[0]), 1) if median_row and median_row[0] is not None else None

    # 4. Top 5 task names by count of good episodes
    top_query = (
        select(Episode.task_name, func.count(Episode.id).label("cnt"))
        .where(Episode.quality == "good")
        .group_by(Episode.task_name)
        .order_by(func.count(Episode.id).desc())
        .limit(5)
    )
    if date_from:
        top_query = top_query.where(Episode.recorded_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        top_query = top_query.where(Episode.recorded_at <= datetime.combine(date_to, datetime.max.time()))

    top_result = await db.execute(top_query)
    top_tasks = [TopTask(task_name=row.task_name, count=row.cnt) for row in top_result.all()]

    return AnalyticsResponse(
        episodes_per_day_robot=episodes_per_day_robot,
        requests_by_status=requests_by_status,
        median_delivery_hours=median_delivery_hours,
        top_tasks=top_tasks,
    )
