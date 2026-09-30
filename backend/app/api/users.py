"""User management endpoints (admin only)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user_payload
from app.db.session import get_db
from app.schemas import UserCreate, UserResponse, UserUpdate
from app.services.auth_service import create_user, get_user_by_id, list_users, update_user

router = APIRouter(prefix="/api/users", tags=["Users"])


def _require_admin(payload: dict) -> dict:
    if payload.get("role") != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return payload


@router.get("", response_model=list[UserResponse], summary="List all users (admin only)")
async def get_users(
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(payload)
    users = await list_users(db)
    return [UserResponse.model_validate(u) for u in users]


@router.post("", response_model=UserResponse, status_code=201, summary="Create user (admin only)")
async def create_user_endpoint(
    body: UserCreate,
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(payload)
    try:
        user = await create_user(
            db, body.name, body.email, body.password, body.role.value, body.organisation
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e))
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse, summary="Update user (admin only)")
async def update_user_endpoint(
    user_id: int,
    body: UserUpdate,
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(payload)
    try:
        user = await update_user(
            db,
            user_id,
            role=body.role.value if body.role else None,
            is_active=body.is_active,
            current_admin_id=int(payload["sub"]),
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return UserResponse.model_validate(user)
