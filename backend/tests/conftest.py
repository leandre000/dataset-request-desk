"""Test fixtures — shared database and client setup for all tests."""

import asyncio
import os
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import User

# Test database URL — use the same DB but a separate schema or the same URL
# Tests use an in-memory approach: we create/drop tables per test session
TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    os.environ.get("DATABASE_URL", "postgresql+psycopg://drd_user:drd_password@localhost:5432/drd_db"),
)

if TEST_DB_URL.startswith("postgresql://"):
    TEST_DB_URL = TEST_DB_URL.replace("postgresql://", "postgresql+psycopg://", 1)
elif "+psycopg_async://" in TEST_DB_URL:
    TEST_DB_URL = TEST_DB_URL.replace("+psycopg_async://", "+psycopg://")


test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionFactory = async_sessionmaker(test_engine, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create all tables, yield session, drop all tables."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionFactory() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """HTTP test client with database dependency override."""

    async def _get_test_db():
        try:
            yield db_session
            await db_session.commit()
        except Exception:
            await db_session.rollback()
            raise

    app.dependency_overrides[get_db] = _get_test_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


async def create_test_user(
    db: AsyncSession,
    email: str = "test@example.com",
    password: str = "testpass",
    role: str = "client",
    name: str = "Test User",
    organisation: str | None = None,
    is_active: bool = True,
) -> User:
    """Helper to create a test user."""
    user = User(
        email=email,
        password_hash=hash_password(password),
        role=role,
        name=name,
        organisation=organisation,
        is_active=is_active,
    )
    db.add(user)
    await db.flush()
    return user


async def login_user(client: AsyncClient, email: str, password: str) -> str:
    """Helper to login and return access token."""
    resp = await client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
