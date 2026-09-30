"""SQLAlchemy ORM models."""

from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    organisation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), onupdate=_utcnow, nullable=False
    )

    requests: Mapped[list["Request"]] = relationship(back_populates="client", lazy="selectin")

    __table_args__ = (
        Index("ix_users_email", "email"),
        CheckConstraint("role IN ('client', 'operator', 'admin')", name="ck_users_role"),
    )


class Request(Base):
    __tablename__ = "requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    task_name: Mapped[str] = mapped_column(String(255), nullable=False)
    episodes_requested: Mapped[int] = mapped_column(Integer, nullable=False)
    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="submitted")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), onupdate=_utcnow, nullable=False
    )

    client: Mapped["User"] = relationship(back_populates="requests", lazy="selectin")
    assignments: Mapped[list["Assignment"]] = relationship(
        back_populates="request", lazy="selectin"
    )
    status_history: Mapped[list["StatusHistory"]] = relationship(
        back_populates="request", lazy="selectin", order_by="StatusHistory.changed_at"
    )

    __table_args__ = (
        Index("ix_requests_client_id", "client_id"),
        Index("ix_requests_status", "status"),
        Index("ix_requests_created_at", "created_at"),
        Index("ix_requests_deadline", "deadline"),
        CheckConstraint(
            "status IN ('submitted', 'in_progress', 'delivered', 'accepted', 'rejected')",
            name="ck_requests_status",
        ),
        CheckConstraint("episodes_requested > 0", name="ck_requests_episodes_positive"),
    )


class Episode(Base):
    __tablename__ = "episodes"

    id: Mapped[int] = mapped_column(primary_key=True)
    episode_id: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    robot_id: Mapped[str] = mapped_column(String(50), nullable=False)
    task_name: Mapped[str] = mapped_column(String(255), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    operator_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quality: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )

    assignment: Mapped["Assignment | None"] = relationship(
        back_populates="episode", uselist=False, lazy="selectin"
    )

    __table_args__ = (
        Index("ix_episodes_episode_id", "episode_id"),
        Index("ix_episodes_robot_id", "robot_id"),
        Index("ix_episodes_task_name", "task_name"),
        Index("ix_episodes_quality", "quality"),
        Index("ix_episodes_recorded_at", "recorded_at"),
        CheckConstraint("quality IN ('good', 'bad', 'usable')", name="ck_episodes_quality"),
        CheckConstraint("duration_seconds > 0", name="ck_episodes_duration_positive"),
    )


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), nullable=False)
    episode_id: Mapped[int] = mapped_column(
        ForeignKey("episodes.id"), nullable=False, unique=True
    )
    assigned_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )

    request: Mapped["Request"] = relationship(back_populates="assignments", lazy="selectin")
    episode: Mapped["Episode"] = relationship(back_populates="assignment", lazy="selectin")
    assigned_by_user: Mapped["User"] = relationship(lazy="selectin")

    __table_args__ = (
        UniqueConstraint("episode_id", name="uq_assignments_episode_id"),
        Index("ix_assignments_request_id", "request_id"),
        Index("ix_assignments_episode_id", "episode_id"),
    )


class StatusHistory(Base):
    __tablename__ = "status_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"), nullable=False)
    previous_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )

    request: Mapped["Request"] = relationship(back_populates="status_history", lazy="selectin")
    user: Mapped["User"] = relationship(lazy="selectin")

    __table_args__ = (
        Index("ix_status_history_request_id", "request_id"),
        Index("ix_status_history_changed_at", "changed_at"),
        CheckConstraint(
            "new_status IN ('submitted', 'in_progress', 'delivered', 'accepted', 'rejected')",
            name="ck_status_history_new_status",
        ),
    )
