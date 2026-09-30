"""Status transition tests — verify workflow rules."""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Assignment, Episode
from tests.conftest import auth_header, create_test_user, login_user


async def _create_episode(db: AsyncSession, episode_id: str, task_name: str, quality: str = "good") -> Episode:
    from datetime import datetime
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
async def test_submitted_to_in_progress(client: AsyncClient, db_session: AsyncSession):
    """Operator can move submitted -> in_progress."""
    await create_test_user(db_session, email="c@test.com", role="client", name="C")
    await create_test_user(db_session, email="op@test.com", role="operator", name="Op")
    await db_session.commit()

    ct = await login_user(client, "c@test.com", "testpass")
    ot = await login_user(client, "op@test.com", "testpass")

    resp = await client.post(
        "/api/requests",
        json={"task_name": "pick cup", "episodes_requested": 1, "deadline": "2027-01-01T00:00:00Z"},
        headers=auth_header(ct),
    )
    req_id = resp.json()["id"]

    resp = await client.post(
        f"/api/requests/{req_id}/status",
        json={"status": "in_progress"},
        headers=auth_header(ot),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"


@pytest.mark.asyncio
async def test_delivery_with_enough_episodes(client: AsyncClient, db_session: AsyncSession):
    """Delivery succeeds when enough episodes are assigned."""
    await create_test_user(db_session, email="c@test.com", role="client", name="C")
    op = await create_test_user(db_session, email="op@test.com", role="operator", name="Op")
    ep = await _create_episode(db_session, "EP-T001", "pick cup")
    await db_session.commit()

    ct = await login_user(client, "c@test.com", "testpass")
    ot = await login_user(client, "op@test.com", "testpass")

    # Create request for 1 episode
    resp = await client.post(
        "/api/requests",
        json={"task_name": "pick cup", "episodes_requested": 1, "deadline": "2027-01-01T00:00:00Z"},
        headers=auth_header(ct),
    )
    req_id = resp.json()["id"]

    # Move to in_progress
    await client.post(f"/api/requests/{req_id}/status", json={"status": "in_progress"}, headers=auth_header(ot))

    # Assign episode
    resp = await client.post(f"/api/requests/{req_id}/assign", json={"episode_id": "EP-T001"}, headers=auth_header(ot))
    assert resp.status_code == 200

    # Deliver
    resp = await client.post(f"/api/requests/{req_id}/deliver", headers=auth_header(ot))
    assert resp.status_code == 200
    assert resp.json()["status"] == "delivered"


@pytest.mark.asyncio
async def test_delivery_fails_without_enough_episodes(client: AsyncClient, db_session: AsyncSession):
    """Delivery fails when not enough episodes are assigned."""
    await create_test_user(db_session, email="c@test.com", role="client", name="C")
    await create_test_user(db_session, email="op@test.com", role="operator", name="Op")
    await db_session.commit()

    ct = await login_user(client, "c@test.com", "testpass")
    ot = await login_user(client, "op@test.com", "testpass")

    resp = await client.post(
        "/api/requests",
        json={"task_name": "pick cup", "episodes_requested": 5, "deadline": "2027-01-01T00:00:00Z"},
        headers=auth_header(ct),
    )
    req_id = resp.json()["id"]

    await client.post(f"/api/requests/{req_id}/status", json={"status": "in_progress"}, headers=auth_header(ot))

    # Try to deliver without any episodes
    resp = await client.post(f"/api/requests/{req_id}/deliver", headers=auth_header(ot))
    assert resp.status_code == 400
    assert "0/5" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_client_accepts_own_delivered_request(client: AsyncClient, db_session: AsyncSession):
    """Client can accept their own delivered request."""
    await create_test_user(db_session, email="c@test.com", role="client", name="C")
    op = await create_test_user(db_session, email="op@test.com", role="operator", name="Op")
    await _create_episode(db_session, "EP-T001", "pick cup")
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
    await client.post(f"/api/requests/{req_id}/assign", json={"episode_id": "EP-T001"}, headers=auth_header(ot))
    await client.post(f"/api/requests/{req_id}/deliver", headers=auth_header(ot))

    resp = await client.post(f"/api/requests/{req_id}/accept", headers=auth_header(ct))
    assert resp.status_code == 200
    assert resp.json()["status"] == "accepted"


@pytest.mark.asyncio
async def test_client_rejects_delivered_request(client: AsyncClient, db_session: AsyncSession):
    """Client can reject their own delivered request."""
    await create_test_user(db_session, email="c@test.com", role="client", name="C")
    op = await create_test_user(db_session, email="op@test.com", role="operator", name="Op")
    await _create_episode(db_session, "EP-T001", "pick cup")
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
    await client.post(f"/api/requests/{req_id}/assign", json={"episode_id": "EP-T001"}, headers=auth_header(ot))
    await client.post(f"/api/requests/{req_id}/deliver", headers=auth_header(ot))

    resp = await client.post(f"/api/requests/{req_id}/reject", headers=auth_header(ct))
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


@pytest.mark.asyncio
async def test_rejected_to_in_progress(client: AsyncClient, db_session: AsyncSession):
    """Operator can move rejected -> in_progress."""
    await create_test_user(db_session, email="c@test.com", role="client", name="C")
    op = await create_test_user(db_session, email="op@test.com", role="operator", name="Op")
    await _create_episode(db_session, "EP-T001", "pick cup")
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
    await client.post(f"/api/requests/{req_id}/assign", json={"episode_id": "EP-T001"}, headers=auth_header(ot))
    await client.post(f"/api/requests/{req_id}/deliver", headers=auth_header(ot))
    await client.post(f"/api/requests/{req_id}/reject", headers=auth_header(ct))

    resp = await client.post(f"/api/requests/{req_id}/status", json={"status": "in_progress"}, headers=auth_header(ot))
    assert resp.status_code == 200
    assert resp.json()["status"] == "in_progress"


@pytest.mark.asyncio
async def test_invalid_transition_fails(client: AsyncClient, db_session: AsyncSession):
    """Invalid status transitions must fail."""
    await create_test_user(db_session, email="c@test.com", role="client", name="C")
    await create_test_user(db_session, email="op@test.com", role="operator", name="Op")
    await db_session.commit()

    ct = await login_user(client, "c@test.com", "testpass")
    ot = await login_user(client, "op@test.com", "testpass")

    resp = await client.post(
        "/api/requests",
        json={"task_name": "pick cup", "episodes_requested": 1, "deadline": "2027-01-01T00:00:00Z"},
        headers=auth_header(ct),
    )
    req_id = resp.json()["id"]

    # submitted -> delivered (invalid)
    resp = await client.post(f"/api/requests/{req_id}/status", json={"status": "delivered"}, headers=auth_header(ot))
    assert resp.status_code == 400

    # submitted -> accepted (invalid)
    resp = await client.post(f"/api/requests/{req_id}/status", json={"status": "accepted"}, headers=auth_header(ct))
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_accepted_cannot_transition(client: AsyncClient, db_session: AsyncSession):
    """Accepted requests cannot transition to any other status."""
    await create_test_user(db_session, email="c@test.com", role="client", name="C")
    op = await create_test_user(db_session, email="op@test.com", role="operator", name="Op")
    await _create_episode(db_session, "EP-T001", "pick cup")
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
    await client.post(f"/api/requests/{req_id}/assign", json={"episode_id": "EP-T001"}, headers=auth_header(ot))
    await client.post(f"/api/requests/{req_id}/deliver", headers=auth_header(ot))
    await client.post(f"/api/requests/{req_id}/accept", headers=auth_header(ct))

    # Try to transition from accepted
    for s in ["submitted", "in_progress", "delivered", "rejected"]:
        resp = await client.post(f"/api/requests/{req_id}/status", json={"status": s}, headers=auth_header(ot))
        assert resp.status_code == 400
