from datetime import date, datetime, time, timedelta

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.project import Project, ProjectStatus
from app.models.task import Task, TaskPriority, TaskStatus
from app.schemas.today import TodayResponse, TodaySummary


def get_today(db: Session, requested_date: date) -> TodayResponse:
    day_start = datetime.combine(requested_date, time.min)
    next_day_start = day_start + timedelta(days=1)

    events = list(
        db.scalars(
            select(Event)
            .where(Event.start_time >= day_start, Event.start_time < next_day_start)
            .order_by(Event.start_time, Event.id)
        ).all()
    )
    due_tasks = list(
        db.scalars(
            select(Task)
            .where(Task.status != TaskStatus.DONE, Task.due_date == requested_date)
            .order_by(Task.id)
        ).all()
    )
    overdue_tasks = list(
        db.scalars(
            select(Task)
            .where(Task.status != TaskStatus.DONE, Task.due_date < requested_date)
            .order_by(Task.due_date, Task.id)
        ).all()
    )
    high_priority_tasks = list(
        db.scalars(
            select(Task)
            .where(
                Task.status != TaskStatus.DONE,
                Task.priority == TaskPriority.HIGH,
                or_(Task.due_date.is_(None), Task.due_date > requested_date),
            )
            .order_by(Task.id)
        ).all()
    )
    active_projects = list(
        db.scalars(
            select(Project)
            .where(Project.status != ProjectStatus.COMPLETED)
            .order_by(Project.id)
        ).all()
    )

    return TodayResponse(
        date=requested_date,
        events=events,
        due_tasks=due_tasks,
        overdue_tasks=overdue_tasks,
        high_priority_tasks=high_priority_tasks,
        active_projects=active_projects,
        summary=TodaySummary(
            event_count=len(events),
            due_task_count=len(due_tasks),
            overdue_task_count=len(overdue_tasks),
            high_priority_task_count=len(high_priority_tasks),
            active_project_count=len(active_projects),
        ),
    )
