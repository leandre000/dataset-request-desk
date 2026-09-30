"""Authentication service."""

from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.models import User


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def authenticate_user(db: AsyncSession, email: str, password: str) -> tuple[User, str]:
    """Authenticate user and return (user, access_token).

    Raises ValueError with descriptive message on failure.
    """
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        raise ValueError("Invalid email or password")

    if not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password")

    if not user.is_active:
        raise ValueError("Account is deactivated. Contact an administrator.")

    token = create_access_token(user.id, user.role)
    return user, token


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    name: str,
    email: str,
    password: str,
    role: str,
    organisation: str | None = None,
) -> User:
    """Create a new user. Raises ValueError if email already exists."""
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise ValueError(f"A user with email {email} already exists")

    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=role,
        organisation=organisation,
        created_at=_utcnow(),
        updated_at=_utcnow(),
    )
    db.add(user)
    await db.flush()
    return user


async def update_user(
    db: AsyncSession,
    user_id: int,
    role: str | None = None,
    is_active: bool | None = None,
    current_admin_id: int | None = None,
) -> User:
    """Update user role/active status. Raises ValueError on invalid operations."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise ValueError("User not found")

    # Prevent deactivating the last active admin
    if is_active is False and user.role == "admin":
        admin_count_result = await db.execute(
            select(User).where(User.role == "admin", User.is_active.is_(True), User.id != user.id)
        )
        remaining_admins = admin_count_result.scalars().all()
        if len(remaining_admins) == 0:
            raise ValueError("Cannot deactivate the last active admin")

    # Prevent changing the role of the last active admin away from admin
    if role is not None and role != "admin" and user.role == "admin":
        admin_count_result = await db.execute(
            select(User).where(User.role == "admin", User.is_active.is_(True), User.id != user.id)
        )
        remaining_admins = admin_count_result.scalars().all()
        if len(remaining_admins) == 0:
            raise ValueError("Cannot change role of the last active admin")

    if role is not None:
        user.role = role
    if is_active is not None:
        user.is_active = is_active
    user.updated_at = _utcnow()

    await db.flush()
    clean_user = await get_user_by_id(db, user_id)
    return clean_user if clean_user is not None else user


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at))
    return list(result.scalars().all())
