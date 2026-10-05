from pydantic import BaseModel


class GoogleCalendarStatus(BaseModel):
    configured: bool
    connected: bool


class GoogleCalendarConnectionResponse(BaseModel):
    status: str
    calendar_id: str
    calendar_summary: str | None = None


class GoogleCalendarDisconnectResponse(BaseModel):
    status: str
