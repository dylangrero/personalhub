from datetime import date, datetime, timezone
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.project import ProjectResponse
from app.schemas.task import TaskResponse


class TodayEventBase(BaseModel):
    title: str
    description: str | None
    start_time: datetime
    end_time: datetime
    location: str | None
    is_all_day: bool
    source_timezone: str | None


class TodayLocalEvent(TodayEventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source: Literal["local"] = "local"
    is_all_day: Literal[False] = False
    source_timezone: None = None
    created_at: datetime


class TodayGoogleEvent(TodayEventBase):
    id: str
    source: Literal["google"] = "google"
    created_at: None = None

    @field_validator("start_time", "end_time", mode="before")
    @classmethod
    def mark_stored_datetimes_as_utc(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value


TodayEvent = Annotated[
    TodayLocalEvent | TodayGoogleEvent,
    Field(discriminator="source"),
]


class TodaySummary(BaseModel):
    event_count: int
    due_task_count: int
    overdue_task_count: int
    high_priority_task_count: int
    active_project_count: int


class TodayResponse(BaseModel):
    date: date
    events: list[TodayEvent]
    due_tasks: list[TaskResponse]
    overdue_tasks: list[TaskResponse]
    high_priority_tasks: list[TaskResponse]
    active_projects: list[ProjectResponse]
    summary: TodaySummary
