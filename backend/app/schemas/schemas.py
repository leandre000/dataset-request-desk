"""Pydantic request/response schemas."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ── Enums ──────────────────────────────────────────────────────────
class RoleEnum(str, Enum):
    client = "client"
    operator = "operator"
    admin = "admin"


class RequestStatusEnum(str, Enum):
    submitted = "submitted"
    in_progress = "in_progress"
    delivered = "delivered"
    accepted = "accepted"
    rejected = "rejected"


class QualityEnum(str, Enum):
    good = "good"
    bad = "bad"
    usable = "usable"


# ── Auth ───────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── User ───────────────────────────────────────────────────────────
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    role: str
    organisation: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: RoleEnum
    organisation: str | None = None


class UserUpdate(BaseModel):
    role: RoleEnum | None = None
    is_active: bool | None = None


# ── Request ────────────────────────────────────────────────────────
class RequestCreate(BaseModel):
    task_name: str = Field(min_length=1, max_length=255)
    episodes_requested: int = Field(gt=0, le=10000)
    deadline: datetime
    notes: str | None = None


class RequestSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: int
    client_name: str | None = None
    client_organisation: str | None = None
    task_name: str
    episodes_requested: int
    episodes_assigned: int = 0
    deadline: datetime
    notes: str | None
    status: str
    created_at: datetime
    updated_at: datetime


class StatusHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    previous_status: str | None
    new_status: str
    changed_by: int
    changed_by_name: str | None = None
    changed_at: datetime


class AssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    request_id: int
    episode_id: int
    episode_code: str | None = None
    assigned_by: int
    assigned_by_name: str | None = None
    assigned_at: datetime


class RequestDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: int
    client_name: str | None = None
    client_organisation: str | None = None
    task_name: str
    episodes_requested: int
    episodes_assigned: int = 0
    deadline: datetime
    notes: str | None
    status: str
    created_at: datetime
    updated_at: datetime
    status_history: list[StatusHistoryResponse] = []
    assignments: list[AssignmentResponse] = []


class StatusUpdate(BaseModel):
    status: RequestStatusEnum


# ── Episode ────────────────────────────────────────────────────────
class EpisodeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    episode_id: str
    robot_id: str
    task_name: str
    recorded_at: datetime
    duration_seconds: int
    operator_name: str
    quality: str
    created_at: datetime
    assigned_to_request_id: int | None = None


class EpisodeAssign(BaseModel):
    episode_id: str = Field(min_length=1)


# ── Import ─────────────────────────────────────────────────────────
class ImportErrorItem(BaseModel):
    row: int
    episode_id: str | None = None
    reason: str


class ImportReport(BaseModel):
    imported: int
    skipped: int
    errors: list[ImportErrorItem]


# ── Analytics ──────────────────────────────────────────────────────
class EpisodesPerDayRobot(BaseModel):
    date: str
    robot_id: str
    count: int


class RequestsByStatus(BaseModel):
    status: str
    count: int


class TopTask(BaseModel):
    task_name: str
    count: int


class AnalyticsResponse(BaseModel):
    episodes_per_day_robot: list[EpisodesPerDayRobot]
    requests_by_status: list[RequestsByStatus]
    median_delivery_hours: float | None
    top_tasks: list[TopTask]


# ── Pagination ─────────────────────────────────────────────────────
class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    pages: int
