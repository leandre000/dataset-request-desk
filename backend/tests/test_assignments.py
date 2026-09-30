"""Assignment tests — verify episode assignment rules."""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Episode
from tests.conftest import auth_header, create_test_user, login_user
from datetime import datetime


async def _create_episode(
    db: AsyncSession, episode_id: str, task_name: str, quality: str = "good"
) -> Episode:
    ep = Episode(
        episode_id=episode_id,
        robot_id="arm-01",
        task_name=task_name,
        recorded_at=datetime(2026, 8, 1),
        duration_seconds=60,
        operator_name="Test",
        quality=quality,
    )
    db.add(ep)
    await db.flush()
    return ep


@pytest.mark.asyncio
async def test_good_episode_can_be_assigned(client: AsyncClient, db_session: AsyncSession):
    await create_test_user(db_session, email="c@test.com", role="client", name="C")
    await create_test_user(db_session, email="op@test.com", role="operator", name="Op")
    await _create_episode(db_session, "EP-A001", "pick cup", "good")
    await db_session.commit()

    ct = await login_user(client, "c@test.com", "testpass")
    ot = await login_user(client, "op@test.com", "testpass")

    resp = await client.post(
        "/api/requests",
        json={"task_name": "pick cup", "episodes_requested": 1, "deadline": "2027-01-01T00:00:00Z"},
        headers=auth_header(ct),
    )
    req_id = resp.json()["id"]
    await client.post(f"/api/requests/{req_id}/status", json={"status": "in_progress"}, headers=auth_header(ot))

    resp = await client.post(f"/api/requests/{req_id}/assign", json={"episode_id": "EP-A001"}, headers=auth_header(ot))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_usable_episode_can_be_assigned(client: AsyncClient, db_session: AsyncSession):
    await create_test_user(db_session, email="c@test.com", role="client", name="C")
    await create_test_user(db_session, email="op@test.com", role="operator", name="Op")
    await _create_episode(db_session, "EP-A001", "pick cup", "usable")
    await db_session.commit()

    ct = await login_user(client, "c@test.com", "testpass")
    ot = await login_user(client, "op@test.com", "testpass")

    resp = await client.post(
        "/api/requests",
        json={"task_name": "pick cup", "episodes_requested": 1, "deadline": "2027-01-01T00:00:00Z"},
        headers=auth_header(ct),
    )
    req_id = resp.json()["id"]
    await client.post(f"/api/requests/{req_id}/status", json={"status": "in_progress"}, headers=auth_header(ot))

    resp = await client.post(f"/api/requests/{req_id}/assign", json={"episode_id": "EP-A001"}, headers=auth_header(ot))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_bad_episode_cannot_be_assigned(client: AsyncClient, db_session: AsyncSession):
    await create_test_user(db_session, email="c@test.com", role="client", name="C")
    await create_test_user(db_session, email="op@test.com", role="operator", name="Op")
    await _create_episode(db_session, "EP-A001", "pick cup", "bad")
    await db_session.commit()

    ct = await login_user(client, "c@test.com", "testpass")
    ot = await login_user(client, "op@test.com", "testpass")

    resp = await client.post(
        "/api/requests",
        json={"task_name": "pick cup", "episodes_requested": 1, "deadline": "2027-01-01T00:00:00Z"},
        headers=auth_header(ct),
    )
    req_id = resp.json()["id"]
    await client.post(f"/api/requests/{req_id}/status", json={"status": "in_progress"}, headers=auth_header(ot))

    resp = await client.post(f"/api/requests/{req_id}/assign", json={"episode_id": "EP-A001"}, headers=auth_header(ot))
    assert resp.status_code == 400
    assert "bad" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_task_mismatch_cannot_be_assigned(client: AsyncClient, db_session: AsyncSession):
    await create_test_user(db_session, email="c@test.com", role="client", name="C")
    await create_test_user(db_session, email="op@test.com", role="operator", name="Op")
    await _create_episode(db_session, "EP-A001", "fold towel", "good")
    await db_session.commit()

    ct = await login_user(client, "c@test.com", "testpass")
    ot = await login_user(client, "op@test.com", "testpass")

    resp = await client.post(
        "/api/requests",
        json={"task_name": "pick cup", "episodes_requested": 1, "deadline": "2027-01-01T00:00:00Z"},
        headers=auth_header(ct),
    )
    req_id = resp.json()["id"]
    await client.post(f"/api/requests/{req_id}/status", json={"status": "in_progress"}, headers=auth_header(ot))

    resp = await client.post(f"/api/requests/{req_id}/assign", json={"episode_id": "EP-A001"}, headers=auth_header(ot))
    assert resp.status_code == 400
    assert "mismatch" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_already_assigned_episode_cannot_be_reassigned(client: AsyncClient, db_session: AsyncSession):
    await create_test_user(db_session, email="c@test.com", role="client", name="C")
    await create_test_user(db_session, email="op@test.com", role="operator", name="Op")
    await _create_episode(db_session, "EP-A001", "pick cup", "good")
    await db_session.commit()

    ct = await login_user(client, "c@test.com", "testpass")
    ot = await login_user(client, "op@test.com", "testpass")

    # Create two requests
    resp = await client.post(
        "/api/requests",
        json={"task_name": "pick cup", "episodes_requested": 1, "deadline": "2027-01-01T00:00:00Z"},
        headers=auth_header(ct),
    )
    req1_id = resp.json()["id"]

    resp = await client.post(
        "/api/requests",
        json={"task_name": "pick cup", "episodes_requested": 1, "deadline": "2027-01-01T00:00:00Z"},
        headers=auth_header(ct),
    )
    req2_id = resp.json()["id"]

    await client.post(f"/api/requests/{req1_id}/status", json={"status": "in_progress"}, headers=auth_header(ot))
    await client.post(f"/api/requests/{req2_id}/status", json={"status": "in_progress"}, headers=auth_header(ot))

    # Assign to first request
    resp = await client.post(f"/api/requests/{req1_id}/assign", json={"episode_id": "EP-A001"}, headers=auth_header(ot))
    assert resp.status_code == 200

    # Try to assign same episode to second request
    resp = await client.post(f"/api/requests/{req2_id}/assign", json={"episode_id": "EP-A001"}, headers=auth_header(ot))
    assert resp.status_code == 409
    assert "already assigned" in resp.json()["detail"].lower()
