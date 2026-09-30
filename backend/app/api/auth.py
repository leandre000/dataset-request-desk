"""Authentication endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user_payload
from app.db.session import get_db
from app.schemas import LoginRequest, TokenResponse, UserResponse
from app.services.auth_service import authenticate_user, get_user_by_id

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse, summary="Login and get access token")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        user, token = await authenticate_user(db, body.email, body.password)
    except ValueError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(e))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse, summary="Get current authenticated user")
async def me(
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    user = await get_user_by_id(db, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return UserResponse.model_validate(user)
