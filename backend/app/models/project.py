from datetime import date, datetime, timezone
from enum import Enum

from sqlalchemy import CheckConstraint, Date, DateTime, Enum as SqlEnum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ProjectStatus(str, Enum):
    PLANNING = "Planning"
    ACTIVE = "Active"
    ON_HOLD = "On hold"
    COMPLETED = "Completed"


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint("progress >= 0 AND progress <= 100", name="progress_between_0_and_100"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ProjectStatus] = mapped_column(
        SqlEnum(
            ProjectStatus,
            native_enum=False,
            values_callable=lambda values: [value.value for value in values],
        ),
        default=ProjectStatus.PLANNING,
        nullable=False,
    )
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    next_action: Mapped[str] = mapped_column(String(255), nullable=False)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
