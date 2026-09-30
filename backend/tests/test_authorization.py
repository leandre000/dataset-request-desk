"""Authorization tests — verify role-based access control."""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import auth_header, create_test_user, login_user


@pytest.mark.asyncio
async def test_client_cannot_access_other_clients_request(client: AsyncClient, db_session: AsyncSession):
    """IDOR protection: client A cannot see client B's request."""
    client_a = await create_test_user(db_session, email="a@test.com", role="client", name="Client A")
    client_b = await create_test_user(db_session, email="b@test.com", role="client", name="Client B")
    await db_session.commit()

    token_a = await login_user(client, "a@test.com", "testpass")
    token_b = await login_user(client, "b@test.com", "testpass")

    # Client A creates a request
    resp = await client.post(
        "/api/requests",
        json={"task_name": "pick cup", "episodes_requested": 5, "deadline": "2027-01-01T00:00:00Z"},
        headers=auth_header(token_a),
    )
    assert resp.status_code == 201
    req_id = resp.json()["id"]

    # Client B cannot see it
    resp = await client.get(f"/api/requests/{req_id}", headers=auth_header(token_b))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_client_cannot_import_episodes(client: AsyncClient, db_session: AsyncSession):
    """Clients must not be able to import episodes."""
    await create_test_user(db_session, email="c@test.com", role="client", name="Client")
    await db_session.commit()
    token = await login_user(client, "c@test.com", "testpass")

    resp = await client.post(
        "/api/episodes/import",
        files={"file": ("test.csv", b"episode_id,robot_id\n", "text/csv")},
        headers=auth_header(token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_client_cannot_assign_episodes(client: AsyncClient, db_session: AsyncSession):
    """Clients must not be able to assign episodes."""
    await create_test_user(db_session, email="c@test.com", role="client", name="Client")
    await db_session.commit()
    token = await login_user(client, "c@test.com", "testpass")

    resp = await client.post(
        "/api/requests/1/assign",
        json={"episode_id": "EP-00001"},
        headers=auth_header(token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_operator_cannot_manage_users(client: AsyncClient, db_session: AsyncSession):
    """Operators must not be able to create or manage users."""
    await create_test_user(db_session, email="op@test.com", role="operator", name="Op")
    await db_session.commit()
    token = await login_user(client, "op@test.com", "testpass")

    resp = await client.get("/api/users", headers=auth_header(token))
    assert resp.status_code == 403

    resp = await client.post(
        "/api/users",
        json={"name": "New", "email": "new@test.com", "password": "pass123", "role": "client"},
        headers=auth_header(token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_manage_users(client: AsyncClient, db_session: AsyncSession):
    """Admins can list and create users."""
    await create_test_user(db_session, email="admin@test.com", role="admin", name="Admin")
    await db_session.commit()
    token = await login_user(client, "admin@test.com", "testpass")

    resp = await client.get("/api/users", headers=auth_header(token))
    assert resp.status_code == 200

    resp = await client.post(
        "/api/users",
        json={"name": "New User", "email": "new@test.com", "password": "pass123", "role": "client"},
        headers=auth_header(token),
    )
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_inactive_user_cannot_authenticate(client: AsyncClient, db_session: AsyncSession):
    """Deactivated users must not be able to log in."""
    await create_test_user(db_session, email="inactive@test.com", role="client", name="Inactive", is_active=False)
    await db_session.commit()

    resp = await client.post("/api/auth/login", json={"email": "inactive@test.com", "password": "testpass"})
    assert resp.status_code == 401
