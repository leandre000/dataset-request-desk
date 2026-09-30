"""Request CRUD and workflow endpoints."""

import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user_payload
from app.db.session import get_db
from app.schemas import (
    AssignmentResponse,
    EpisodeAssign,
    RequestCreate,
    RequestDetail,
    RequestSummary,
    StatusHistoryResponse,
    StatusUpdate,
)
from app.services.auth_service import get_user_by_id
from app.services.episode_service import assign_episode
from app.services.request_service import (
    create_request,
    get_assignment_count,
    get_request_by_id,
    list_requests,
    update_request_status,
)

router = APIRouter(prefix="/api/requests", tags=["Requests"])


def _to_summary(req, assigned_count: int) -> dict:
    return {
        "id": req.id,
        "client_id": req.client_id,
        "client_name": req.client.name if req.client else None,
        "client_organisation": req.client.organisation if req.client else None,
        "task_name": req.task_name,
        "episodes_requested": req.episodes_requested,
        "episodes_assigned": assigned_count,
        "deadline": req.deadline,
        "notes": req.notes,
        "status": req.status,
        "created_at": req.created_at,
        "updated_at": req.updated_at,
    }


def _to_detail(req) -> dict:
    assigned_count = len(req.assignments) if req.assignments else 0
    return {
        "id": req.id,
        "client_id": req.client_id,
        "client_name": req.client.name if req.client else None,
        "client_organisation": req.client.organisation if req.client else None,
        "task_name": req.task_name,
        "episodes_requested": req.episodes_requested,
        "episodes_assigned": assigned_count,
        "deadline": req.deadline,
        "notes": req.notes,
        "status": req.status,
        "created_at": req.created_at,
        "updated_at": req.updated_at,
        "status_history": [
            {
                "id": h.id,
                "previous_status": h.previous_status,
                "new_status": h.new_status,
                "changed_by": h.changed_by,
                "changed_by_name": h.user.name if h.user else None,
                "changed_at": h.changed_at,
            }
            for h in (req.status_history or [])
        ],
        "assignments": [
            {
                "id": a.id,
                "request_id": a.request_id,
                "episode_id": a.episode_id,
                "episode_code": a.episode.episode_id if a.episode else None,
                "assigned_by": a.assigned_by,
                "assigned_by_name": a.assigned_by_user.name if a.assigned_by_user else None,
                "assigned_at": a.assigned_at,
            }
            for a in (req.assignments or [])
        ],
    }


@router.get("", summary="List requests (filtered by role)")
async def get_requests(
    status_filter: str | None = Query(None, alias="status"),
    task_name: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    user_role = payload.get("role")
    user_id = int(payload["sub"])

    # Clients can only see their own requests
    client_id = user_id if user_role == "client" else None

    reqs, total = await list_requests(
        db,
        client_id=client_id,
        status=status_filter,
        task_name=task_name,
        search=search,
        page=page,
        page_size=page_size,
    )

    items = []
    for req in reqs:
        count = len(req.assignments) if req.assignments else 0
        items.append(_to_summary(req, count))

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if total > 0 else 0,
    }


@router.post("", status_code=201, summary="Create a new dataset request (client only)")
async def create_request_endpoint(
    body: RequestCreate,
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    user_role = payload.get("role")
    if user_role != "client":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only clients can create requests")

    user_id = int(payload["sub"])
    req = await create_request(
        db,
        client_id=user_id,
        task_name=body.task_name,
        episodes_requested=body.episodes_requested,
        deadline=body.deadline,
        notes=body.notes,
    )
    return _to_detail(req)


@router.get("/{request_id}", response_model=RequestDetail, summary="Get request detail")
async def get_request_detail(
    request_id: int,
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    req = await get_request_by_id(db, request_id)
    if req is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")

    user_role = payload.get("role")
    user_id = int(payload["sub"])

    # IDOR protection: clients can only see their own requests
    if user_role == "client" and req.client_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")

    return _to_detail(req)


@router.post("/{request_id}/status", summary="Update request status")
async def update_status(
    request_id: int,
    body: StatusUpdate,
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    user_id = int(payload["sub"])
    user_role = payload.get("role")

    try:
        req = await update_request_status(db, request_id, body.status.value, user_id, user_role)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    return _to_detail(req)


@router.post("/{request_id}/assign", summary="Assign episode to request (operator/admin)")
async def assign_episode_endpoint(
    request_id: int,
    body: EpisodeAssign,
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    user_role = payload.get("role")
    if user_role not in ("operator", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only operators and admins can assign episodes")

    user_id = int(payload["sub"])

    try:
        assignment = await assign_episode(db, request_id, body.episode_id, user_id)
    except ValueError as e:
        msg = str(e)
        if "already assigned" in msg.lower():
            raise HTTPException(status.HTTP_409_CONFLICT, msg)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, msg)

    return {
        "id": assignment.id,
        "request_id": assignment.request_id,
        "episode_id": assignment.episode_id,
        "assigned_by": assignment.assigned_by,
        "assigned_at": assignment.assigned_at,
    }


@router.post("/{request_id}/deliver", summary="Deliver request (operator/admin)")
async def deliver_request(
    request_id: int,
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    user_role = payload.get("role")
    if user_role not in ("operator", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only operators and admins can deliver requests")

    user_id = int(payload["sub"])
    try:
        req = await update_request_status(db, request_id, "delivered", user_id, user_role)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return _to_detail(req)


@router.post("/{request_id}/accept", summary="Accept delivery (owning client only)")
async def accept_request(
    request_id: int,
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    user_role = payload.get("role")
    if user_role != "client":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only clients can accept requests")

    user_id = int(payload["sub"])
    try:
        req = await update_request_status(db, request_id, "accepted", user_id, user_role)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return _to_detail(req)


@router.post("/{request_id}/reject", summary="Reject delivery (owning client only)")
async def reject_request(
    request_id: int,
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    user_role = payload.get("role")
    if user_role != "client":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only clients can reject requests")

    user_id = int(payload["sub"])
    try:
        req = await update_request_status(db, request_id, "rejected", user_id, user_role)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    return _to_detail(req)
