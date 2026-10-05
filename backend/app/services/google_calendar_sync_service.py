from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.google_calendar_event import GoogleCalendarEvent
from app.schemas.google_calendar import GoogleCalendarSyncResult
from app.services import google_calendar_service

SYNC_PAST_DAYS = 30
SYNC_FUTURE_DAYS = 365


@dataclass(frozen=True)
class ParsedGoogleEvent:
    google_event_id: str
    title: str
    description: str | None
    location: str | None
    start_time: datetime
    end_time: datetime
    is_all_day: bool
    start_date: date | None
    end_date: date | None
    start_timezone: str
    end_timezone: str
    status: str
    google_updated_at: datetime | None


def sync_google_calendar(
    db: Session,
    now: datetime | None = None,
) -> GoogleCalendarSyncResult:
    sync_time = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    time_min = sync_time - timedelta(days=SYNC_PAST_DAYS)
    time_max = sync_time + timedelta(days=SYNC_FUTURE_DAYS)
    snapshot = google_calendar_service.fetch_primary_calendar_events(time_min, time_max)

    return reconcile_google_events(
        db,
        snapshot,
        time_min=time_min,
        time_max=time_max,
        synced_at=sync_time,
    )


def get_active_google_events(db: Session) -> list[GoogleCalendarEvent]:
    return list(
        db.scalars(
            select(GoogleCalendarEvent)
            .where(GoogleCalendarEvent.status != "cancelled")
            .order_by(GoogleCalendarEvent.start_time, GoogleCalendarEvent.id)
        ).all()
    )


def reconcile_google_events(
    db: Session,
    snapshot: google_calendar_service.GoogleCalendarSnapshot,
    time_min: datetime,
    time_max: datetime,
    synced_at: datetime,
) -> GoogleCalendarSyncResult:
    existing_events = list(
        db.scalars(
            select(GoogleCalendarEvent).where(
                GoogleCalendarEvent.calendar_id == snapshot.calendar_id
            )
        ).all()
    )
    existing_by_google_id = {
        event.google_event_id: event for event in existing_events
    }
    seen_google_ids: set[str] = set()
    created = 0
    updated = 0
    removed = 0
    unchanged = 0
    synced_at_utc = _utc_naive(synced_at)

    for source_event in snapshot.events:
        google_event_id = source_event.get("id")
        if not isinstance(google_event_id, str) or not google_event_id:
            continue

        seen_google_ids.add(google_event_id)
        existing = existing_by_google_id.get(google_event_id)
        if source_event.get("status") == "cancelled":
            if existing is not None and existing.status != "cancelled":
                existing.status = "cancelled"
                existing.synced_at = synced_at_utc
                removed += 1
            elif existing is not None:
                unchanged += 1
            continue

        try:
            parsed = _parse_google_event(source_event, snapshot.calendar_timezone)
        except (KeyError, TypeError, ValueError) as error:
            raise google_calendar_service.GoogleCalendarApiError(
                "Google Calendar returned an invalid event"
            ) from error
        values = {
            "title": parsed.title,
            "description": parsed.description,
            "location": parsed.location,
            "start_time": parsed.start_time,
            "end_time": parsed.end_time,
            "is_all_day": parsed.is_all_day,
            "start_date": parsed.start_date,
            "end_date": parsed.end_date,
            "start_timezone": parsed.start_timezone,
            "end_timezone": parsed.end_timezone,
            "status": parsed.status,
            "google_updated_at": parsed.google_updated_at,
        }

        if existing is None:
            existing = GoogleCalendarEvent(
                google_event_id=google_event_id,
                calendar_id=snapshot.calendar_id,
                synced_at=synced_at_utc,
                **values,
            )
            db.add(existing)
            existing_by_google_id[google_event_id] = existing
            created += 1
        elif any(getattr(existing, field) != value for field, value in values.items()):
            for field, value in values.items():
                setattr(existing, field, value)
            existing.synced_at = synced_at_utc
            updated += 1
        else:
            unchanged += 1

    window_start = _utc_naive(time_min)
    window_end = _utc_naive(time_max)
    for existing in existing_events:
        overlaps_window = existing.end_time > window_start and existing.start_time < window_end
        if (
            existing.status != "cancelled"
            and overlaps_window
            and existing.google_event_id not in seen_google_ids
        ):
            existing.status = "cancelled"
            existing.synced_at = synced_at_utc
            removed += 1

    db.commit()
    return GoogleCalendarSyncResult(
        fetched=len(snapshot.events),
        created=created,
        updated=updated,
        removed=removed,
        unchanged=unchanged,
    )


def _parse_google_event(
    source_event: dict[str, Any],
    calendar_timezone: str,
) -> ParsedGoogleEvent:
    start = source_event.get("start") or {}
    end = source_event.get("end") or {}
    is_all_day = "date" in start
    start_timezone = str(start.get("timeZone") or calendar_timezone or "UTC")
    end_timezone = str(end.get("timeZone") or start_timezone)

    if is_all_day:
        start_date = date.fromisoformat(start["date"])
        end_date = date.fromisoformat(end["date"])
        start_time = _all_day_boundary(start_date, start_timezone)
        end_time = _all_day_boundary(end_date, end_timezone)
    else:
        start_date = None
        end_date = None
        start_time = _parse_datetime(start["dateTime"], start_timezone)
        end_time = _parse_datetime(end["dateTime"], end_timezone)

    return ParsedGoogleEvent(
        google_event_id=str(source_event["id"]),
        title=str(source_event.get("summary") or "Untitled event")[:255],
        description=_optional_text(source_event.get("description")),
        location=_optional_text(source_event.get("location"), maximum_length=1024),
        start_time=start_time,
        end_time=end_time,
        is_all_day=is_all_day,
        start_date=start_date,
        end_date=end_date,
        start_timezone=start_timezone,
        end_timezone=end_timezone,
        status=str(source_event.get("status") or "confirmed"),
        google_updated_at=(
            _parse_datetime(source_event["updated"], "UTC")
            if source_event.get("updated")
            else None
        ),
    )


def _parse_datetime(value: str, fallback_timezone: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=_timezone(fallback_timezone))
    return _utc_naive(parsed)


def _all_day_boundary(value: date, timezone_name: str) -> datetime:
    local_midnight = datetime.combine(value, time.min, tzinfo=_timezone(timezone_name))
    return _utc_naive(local_midnight)


def _timezone(name: str) -> ZoneInfo:
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def _utc_naive(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def _optional_text(value: object, maximum_length: int | None = None) -> str | None:
    if not isinstance(value, str) or not value:
        return None
    return value[:maximum_length] if maximum_length else value
