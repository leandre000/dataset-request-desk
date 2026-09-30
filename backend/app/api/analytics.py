"""Analytics endpoints."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user_payload
from app.db.session import get_db
from app.schemas import AnalyticsResponse
from app.services.analytics_service import get_analytics

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("", response_model=AnalyticsResponse, summary="Get analytics dashboard data")
async def analytics(
    date_from: date | None = None,
    date_to: date | None = None,
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    user_role = payload.get("role")
    if user_role not in ("operator", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only operators and admins can view analytics")

    if date_from and date_to and date_from > date_to:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "date_from must be before date_to")

    return await get_analytics(db, date_from, date_to)
