from datetime import date, datetime, timezone

from pydantic import BaseModel, ConfigDict, field_validator


class GoogleCalendarStatus(BaseModel):
    configured: bool
    connected: bool


class GoogleCalendarConnectionResponse(BaseModel):
    status: str
    calendar_id: str
    calendar_summary: str | None = None


class GoogleCalendarDisconnectResponse(BaseModel):
    status: str


class GoogleCalendarSyncResult(BaseModel):
    fetched: int
    created: int
    updated: int
    removed: int
    unchanged: int


class GoogleCalendarEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    google_event_id: str
    calendar_id: str
    title: str
    description: str | None
    location: str | None
    start_time: datetime
    end_time: datetime
    is_all_day: bool
    start_date: date | None
    end_date: date | None
    start_timezone: str | None
    end_timezone: str | None
    status: str
    google_updated_at: datetime | None
    synced_at: datetime

    @field_validator(
        "start_time",
        "end_time",
        "google_updated_at",
        "synced_at",
        mode="before",
    )
    @classmethod
    def mark_stored_datetimes_as_utc(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
