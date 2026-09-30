"""Analytics tests — verify database queries, aggregation, and authorization."""

from datetime import datetime, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Episode, Request, StatusHistory
from tests.conftest import auth_header, create_test_user, login_user


@pytest.mark.asyncio
async def test_analytics_forbidden_for_clients(client: AsyncClient, db_session: AsyncSession):
    await create_test_user(db_session, email="client@test.com", role="client")
    await db_session.commit()

    token = await login_user(client, "client@test.com", "testpass")
    resp = await client.get("/api/analytics", headers=auth_header(token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_analytics_accessible_to_operator(client: AsyncClient, db_session: AsyncSession):
    await create_test_user(db_session, email="op@test.com", role="operator")

    # Add episodes
    ep1 = Episode(
        episode_id="EP-001",
        robot_id="arm-01",
        task_name="pick_cup",
        recorded_at=datetime(2026, 8, 1, 10, 0, tzinfo=timezone.utc),
        duration_seconds=45,
        operator_name="Tester",
        quality="good",
    )
    ep2 = Episode(
        episode_id="EP-002",
        robot_id="arm-01",
        task_name="pick_cup",
        recorded_at=datetime(2026, 8, 1, 11, 0, tzinfo=timezone.utc),
        duration_seconds=50,
        operator_name="Tester",
        quality="good",
    )
    ep3 = Episode(
        episode_id="EP-003",
        robot_id="arm-02",
        task_name="open_door",
        recorded_at=datetime(2026, 8, 2, 12, 0, tzinfo=timezone.utc),
        duration_seconds=30,
        operator_name="Tester",
        quality="bad",
    )
    db_session.add_all([ep1, ep2, ep3])
    await db_session.commit()

    token = await login_user(client, "op@test.com", "testpass")
    resp = await client.get("/api/analytics", headers=auth_header(token))
    assert resp.status_code == 200

    data = resp.json()
    assert "episodes_per_day_robot" in data
    assert "requests_by_status" in data
    assert "top_tasks" in data
    assert "median_delivery_hours" in data

    # Verify top tasks lists good quality episodes only
    top_task_names = [t["task_name"] for t in data["top_tasks"]]
    assert "pick_cup" in top_task_names
    # open_door was quality="bad", so it should have 0 good or not be in top_tasks
    assert "open_door" not in top_task_names
