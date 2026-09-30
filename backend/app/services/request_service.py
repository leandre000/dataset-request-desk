"""Request workflow service with strict status transition rules."""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Assignment, Request, StatusHistory, User

# Valid transitions: (from_status, to_status) -> allowed roles
_VALID_TRANSITIONS: dict[tuple[str, str], set[str]] = {
    ("submitted", "in_progress"): {"operator", "admin"},
    ("in_progress", "delivered"): {"operator", "admin"},
    ("delivered", "accepted"): {"client"},
    ("delivered", "rejected"): {"client"},
    ("rejected", "in_progress"): {"operator", "admin"},
}


async def create_request(
    db: AsyncSession,
    client_id: int,
    task_name: str,
    episodes_requested: int,
    deadline: datetime,
    notes: str | None,
) -> Request:
    """Create a new dataset request and initial status history."""
    req = Request(
        client_id=client_id,
        task_name=task_name.strip(),
        episodes_requested=episodes_requested,
        deadline=deadline,
        notes=notes.strip() if notes else None,
        status="submitted",
    )
    db.add(req)
    await db.flush()

    history = StatusHistory(
        request_id=req.id,
        previous_status=None,
        new_status="submitted",
        changed_by=client_id,
    )
    db.add(history)
    await db.flush()

    loaded = await get_request_by_id(db, req.id)
    return loaded if loaded is not None else req


async def get_request_by_id(db: AsyncSession, request_id: int) -> Request | None:
    result = await db.execute(
        select(Request)
        .options(
            selectinload(Request.client),
            selectinload(Request.assignments).selectinload(Assignment.episode),
            selectinload(Request.assignments).selectinload(Assignment.assigned_by_user),
            selectinload(Request.status_history).selectinload(StatusHistory.user),
        )
        .where(Request.id == request_id)
    )
    return result.scalar_one_or_none()


async def list_requests(
    db: AsyncSession,
    client_id: int | None = None,
    status: str | None = None,
    task_name: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Request], int]:
    """List requests with optional filtering and pagination."""
    query = select(Request).options(
        selectinload(Request.client),
        selectinload(Request.assignments),
    )
    count_query = select(func.count(Request.id))

    if client_id is not None:
        query = query.where(Request.client_id == client_id)
        count_query = count_query.where(Request.client_id == client_id)
    if status is not None:
        query = query.where(Request.status == status)
        count_query = count_query.where(Request.status == status)
    if task_name is not None:
        query = query.where(Request.task_name == task_name)
        count_query = count_query.where(Request.task_name == task_name)
    if search is not None:
        pattern = f"%{search}%"
        query = query.where(Request.task_name.ilike(pattern))
        count_query = count_query.where(Request.task_name.ilike(pattern))

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Request.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    return list(result.scalars().all()), total


async def update_request_status(
    db: AsyncSession,
    request_id: int,
    new_status: str,
    user_id: int,
    user_role: str,
    rework_notes: str | None = None,
) -> Request:
    """Transition request to a new status with validation.

    Raises ValueError with descriptive message on failure.
    """
    req = await get_request_by_id(db, request_id)
    if req is None:
        raise ValueError("Request not found")

    transition = (req.status, new_status)
    allowed_roles = _VALID_TRANSITIONS.get(transition)

    if allowed_roles is None:
        raise ValueError(f"Cannot transition from '{req.status}' to '{new_status}'")

    if user_role not in allowed_roles:
        raise ValueError(f"Role '{user_role}' is not allowed to make this transition")

    # Client can only accept/reject their own request
    if user_role == "client" and req.client_id != user_id:
        raise ValueError("You can only accept or reject your own requests")

    # Delivery validation: must have enough assigned episodes
    if new_status == "delivered":
        assigned_count_result = await db.execute(
            select(func.count(Assignment.id)).where(Assignment.request_id == request_id)
        )
        assigned = assigned_count_result.scalar() or 0
        if assigned < req.episodes_requested:
            raise ValueError(
                f"Cannot deliver: only {assigned}/{req.episodes_requested} episodes assigned"
            )

    previous_status = req.status
    req.status = new_status

    history = StatusHistory(
        request_id=request_id,
        previous_status=previous_status,
        new_status=new_status,
        changed_by=user_id,
    )
    db.add(history)
    await db.flush()

    loaded = await get_request_by_id(db, request_id)
    return loaded if loaded is not None else req


async def get_assignment_count(db: AsyncSession, request_id: int) -> int:
    result = await db.execute(
        select(func.count(Assignment.id)).where(Assignment.request_id == request_id)
    )
    return result.scalar() or 0
