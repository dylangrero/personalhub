from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.google_calendar_event import GoogleCalendarEvent
from app.models.project import Project, ProjectStatus
from app.models.task import Task, TaskPriority, TaskStatus
from app.schemas.today import (
    TodayEvent,
    TodayGoogleEvent,
    TodayLocalEvent,
    TodayResponse,
    TodaySummary,
)


def get_today(db: Session, requested_date: date) -> TodayResponse:
    day_start = datetime.combine(requested_date, time.min)
    next_day_start = day_start + timedelta(days=1)

    local_events = list(
        db.scalars(
            select(Event)
            .where(Event.start_time >= day_start, Event.start_time < next_day_start)
            .order_by(Event.start_time, Event.id)
        ).all()
    )
    google_events = [
        event
        for event in db.scalars(
            select(GoogleCalendarEvent).where(
                GoogleCalendarEvent.status != "cancelled"
            )
        ).all()
        if _google_event_occurs_on(event, requested_date)
    ]
    events: list[TodayEvent] = [
        *(_local_today_event(event) for event in local_events),
        *(_google_today_event(event) for event in google_events),
    ]
    events.sort(key=_event_order)
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


def _local_today_event(event: Event) -> TodayLocalEvent:
    return TodayLocalEvent.model_validate(event)


def _google_today_event(event: GoogleCalendarEvent) -> TodayGoogleEvent:
    return TodayGoogleEvent(
        id=event.google_event_id,
        title=event.title,
        description=event.description,
        start_time=event.start_time,
        end_time=event.end_time,
        location=event.location,
        is_all_day=event.is_all_day,
        source_timezone=event.start_timezone,
    )


def _google_event_occurs_on(event: GoogleCalendarEvent, requested_date: date) -> bool:
    if event.is_all_day:
        return bool(
            event.start_date
            and event.end_date
            and event.start_date <= requested_date < event.end_date
        )

    return _google_local_datetime(event.start_time, event.start_timezone).date() == requested_date


def _google_local_datetime(value: datetime, timezone_name: str | None) -> datetime:
    stored_utc = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value
    try:
        target_timezone = ZoneInfo(timezone_name or "UTC")
    except ZoneInfoNotFoundError:
        target_timezone = ZoneInfo("UTC")
    return stored_utc.astimezone(target_timezone)


def _event_order(event: TodayEvent) -> tuple[int, time, str, str]:
    if event.is_all_day:
        display_time = time.min
    elif event.source == "google":
        display_time = _google_local_datetime(
            event.start_time,
            event.source_timezone,
        ).time().replace(tzinfo=None)
    else:
        display_time = event.start_time.time().replace(tzinfo=None)

    return (
        0 if event.is_all_day else 1,
        display_time,
        event.source,
        str(event.id),
    )
