"""Episode management and assignment service."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Assignment, Episode, Request


async def list_episodes(
    db: AsyncSession,
    search: str | None = None,
    robot_id: str | None = None,
    task_name: str | None = None,
    quality: str | None = None,
    assigned: bool | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Episode], int]:
    """List episodes with filtering and pagination."""
    query = select(Episode).options(selectinload(Episode.assignment))
    count_query = select(func.count(Episode.id))

    if search:
        pattern = f"%{search}%"
        query = query.where(Episode.episode_id.ilike(pattern))
        count_query = count_query.where(Episode.episode_id.ilike(pattern))
    if robot_id:
        query = query.where(Episode.robot_id == robot_id)
        count_query = count_query.where(Episode.robot_id == robot_id)
    if task_name:
        query = query.where(Episode.task_name == task_name)
        count_query = count_query.where(Episode.task_name == task_name)
    if quality:
        query = query.where(Episode.quality == quality)
        count_query = count_query.where(Episode.quality == quality)

    if assigned is True:
        query = query.where(Episode.id.in_(select(Assignment.episode_id)))
        count_query = count_query.where(
            Episode.id.in_(select(Assignment.episode_id))
        )
    elif assigned is False:
        query = query.where(Episode.id.notin_(select(Assignment.episode_id)))
        count_query = count_query.where(
            Episode.id.notin_(select(Assignment.episode_id))
        )

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Episode.episode_id)
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    return list(result.scalars().all()), total


async def get_episode_by_episode_id(db: AsyncSession, episode_id: str) -> Episode | None:
    result = await db.execute(
        select(Episode).options(selectinload(Episode.assignment)).where(Episode.episode_id == episode_id)
    )
    return result.scalar_one_or_none()


async def get_robot_ids(db: AsyncSession) -> list[str]:
    result = await db.execute(select(Episode.robot_id).distinct().order_by(Episode.robot_id))
    return list(result.scalars().all())


async def get_task_names(db: AsyncSession) -> list[str]:
    result = await db.execute(select(Episode.task_name).distinct().order_by(Episode.task_name))
    return list(result.scalars().all())


async def assign_episode(
    db: AsyncSession,
    request_id: int,
    episode_id_str: str,
    assigned_by: int,
) -> Assignment:
    """Assign an episode to a request with validation.

    Rules:
    - Episode must exist
    - Episode quality must be 'good' or 'usable' (not 'bad')
    - Episode must NOT already be assigned to ANY request
    - Request must exist
    - Request status must allow assignment ('submitted', 'in_progress')
    - Episode task_name must match request task_name
    """
    episode = await get_episode_by_episode_id(db, episode_id_str)
    if episode is None:
        raise ValueError(f"Episode {episode_id_str} not found")

    # Check quality
    if episode.quality == "bad":
        raise ValueError(f"Episode {episode_id_str} has quality 'bad' and cannot be assigned")

    # Check already assigned
    existing = await db.execute(
        select(Assignment).where(Assignment.episode_id == episode.id)
    )
    if existing.scalar_one_or_none() is not None:
        raise ValueError(f"Episode {episode_id_str} is already assigned to another request")

    # Validate request
    req_result = await db.execute(select(Request).where(Request.id == request_id))
    req = req_result.scalar_one_or_none()
    if req is None:
        raise ValueError("Request not found")

    # Check request status allows assignment
    if req.status not in ("submitted", "in_progress"):
        raise ValueError(f"Cannot assign episodes to a request with status '{req.status}'")

    # Check task match (case-insensitive)
    if episode.task_name.lower() != req.task_name.lower():
        raise ValueError(
            f"Task mismatch: episode task is '{episode.task_name}', "
            f"request task is '{req.task_name}'"
        )

    assignment = Assignment(
        request_id=request_id,
        episode_id=episode.id,
        assigned_by=assigned_by,
    )
    db.add(assignment)
    await db.flush()
    return assignment


async def unassign_episode(
    db: AsyncSession,
    assignment_id: int,
) -> None:
    """Remove an assignment."""
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if assignment is None:
        raise ValueError("Assignment not found")
    await db.delete(assignment)
    await db.flush()


async def get_compatible_episodes(
    db: AsyncSession,
    request_id: int,
    search: str | None = None,
    robot_id: str | None = None,
    quality: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Episode], int]:
    """Get episodes compatible with a request (matching task, not bad, not assigned)."""
    req_result = await db.execute(select(Request).where(Request.id == request_id))
    req = req_result.scalar_one_or_none()
    if req is None:
        raise ValueError("Request not found")

    assigned_ids = select(Assignment.episode_id)

    query = (
        select(Episode)
        .options(selectinload(Episode.assignment))
        .where(
            Episode.task_name == req.task_name,
            Episode.quality.in_(["good", "usable"]),
            Episode.id.notin_(assigned_ids),
        )
    )
    count_query = select(func.count(Episode.id)).where(
        Episode.task_name == req.task_name,
        Episode.quality.in_(["good", "usable"]),
        Episode.id.notin_(assigned_ids),
    )

    if search:
        pattern = f"%{search}%"
        query = query.where(Episode.episode_id.ilike(pattern))
        count_query = count_query.where(Episode.episode_id.ilike(pattern))
    if robot_id:
        query = query.where(Episode.robot_id == robot_id)
        count_query = count_query.where(Episode.robot_id == robot_id)
    if quality:
        query = query.where(Episode.quality == quality)
        count_query = count_query.where(Episode.quality == quality)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Episode.episode_id)
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    return list(result.scalars().all()), total
