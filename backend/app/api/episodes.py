"""Episode browsing and CSV import endpoints."""

import math

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user_payload
from app.db.session import get_db
from app.schemas import EpisodeResponse, ImportReport
from app.services.episode_service import (
    get_compatible_episodes,
    get_robot_ids,
    get_task_names,
    list_episodes,
)
from app.services.import_service import import_episodes_csv

router = APIRouter(prefix="/api/episodes", tags=["Episodes"])


def _episode_to_dict(ep) -> dict:
    return {
        "id": ep.id,
        "episode_id": ep.episode_id,
        "robot_id": ep.robot_id,
        "task_name": ep.task_name,
        "recorded_at": ep.recorded_at,
        "duration_seconds": ep.duration_seconds,
        "operator_name": ep.operator_name,
        "quality": ep.quality,
        "created_at": ep.created_at,
        "assigned_to_request_id": ep.assignment.request_id if ep.assignment else None,
    }


@router.get("", summary="List episodes with filtering and pagination")
async def get_episodes(
    search: str | None = None,
    robot_id: str | None = None,
    task_name: str | None = None,
    quality: str | None = None,
    assigned: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    user_role = payload.get("role")
    if user_role not in ("operator", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only operators and admins can view episodes")

    episodes, total = await list_episodes(
        db, search=search, robot_id=robot_id, task_name=task_name,
        quality=quality, assigned=assigned, page=page, page_size=page_size,
    )

    return {
        "items": [_episode_to_dict(ep) for ep in episodes],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if total > 0 else 0,
    }


@router.get("/compatible/{request_id}", summary="Get episodes compatible with a request")
async def get_compatible(
    request_id: int,
    search: str | None = None,
    robot_id: str | None = None,
    quality: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    user_role = payload.get("role")
    if user_role not in ("operator", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only operators and admins can view episodes")

    try:
        episodes, total = await get_compatible_episodes(
            db, request_id, search=search, robot_id=robot_id,
            quality=quality, page=page, page_size=page_size,
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))

    return {
        "items": [_episode_to_dict(ep) for ep in episodes],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if total > 0 else 0,
    }


@router.post("/import", response_model=ImportReport, summary="Import episodes from CSV")
async def import_csv(
    file: UploadFile = File(...),
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    user_role = payload.get("role")
    if user_role not in ("operator", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only operators and admins can import episodes")

    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File must be a .csv file")

    content = await file.read()
    try:
        csv_text = content.decode("utf-8-sig")  # Handle BOM
    except UnicodeDecodeError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File must be UTF-8 encoded")

    report = await import_episodes_csv(db, csv_text)
    return report


@router.get("/meta/tasks", summary="Get distinct task names")
async def get_tasks(
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    user_role = payload.get("role")
    if user_role not in ("operator", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only operators and admins can view episodes")
    return await get_task_names(db)


@router.get("/meta/robots", summary="Get distinct robot IDs")
async def get_robots(
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    user_role = payload.get("role")
    if user_role not in ("operator", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only operators and admins can view episodes")
    return await get_robot_ids(db)
