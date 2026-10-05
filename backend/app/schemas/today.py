from datetime import date

from pydantic import BaseModel

from app.schemas.event import EventResponse
from app.schemas.project import ProjectResponse
from app.schemas.task import TaskResponse


class TodaySummary(BaseModel):
    event_count: int
    due_task_count: int
    overdue_task_count: int
    high_priority_task_count: int
    active_project_count: int


class TodayResponse(BaseModel):
    date: date
    events: list[EventResponse]
    due_tasks: list[TaskResponse]
    overdue_tasks: list[TaskResponse]
    high_priority_tasks: list[TaskResponse]
    active_projects: list[ProjectResponse]
    summary: TodaySummary
