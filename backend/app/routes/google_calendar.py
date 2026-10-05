from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.google_calendar import (
    GoogleCalendarConnectionResponse,
    GoogleCalendarDisconnectResponse,
    GoogleCalendarEventResponse,
    GoogleCalendarStatus,
    GoogleCalendarSyncResult,
)
from app.services import google_calendar_service, google_calendar_sync_service

router = APIRouter(prefix="/integrations/google-calendar", tags=["google-calendar"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("/status", response_model=GoogleCalendarStatus)
def connection_status() -> GoogleCalendarStatus:
    return GoogleCalendarStatus(**google_calendar_service.get_connection_status())


@router.get("/connect", response_class=RedirectResponse)
def connect() -> RedirectResponse:
    try:
        authorization_url = google_calendar_service.start_connection()
    except google_calendar_service.GoogleCalendarConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except google_calendar_service.GoogleCalendarOAuthError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error

    return RedirectResponse(authorization_url)


@router.get("/callback", response_model=GoogleCalendarConnectionResponse)
def callback(
    state: str = Query(min_length=1),
    code: str = Query(min_length=1),
) -> GoogleCalendarConnectionResponse:
    try:
        result = google_calendar_service.finish_connection(state, code)
    except google_calendar_service.GoogleCalendarConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except google_calendar_service.GoogleCalendarStateError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except google_calendar_service.GoogleCalendarOAuthError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error

    return GoogleCalendarConnectionResponse(**result)


@router.delete("/disconnect", response_model=GoogleCalendarDisconnectResponse)
def disconnect() -> GoogleCalendarDisconnectResponse:
    try:
        google_calendar_service.disconnect()
    except google_calendar_service.GoogleCalendarConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    return GoogleCalendarDisconnectResponse(status="disconnected")


@router.post("/sync", response_model=GoogleCalendarSyncResult)
def sync_google_calendar(db: DatabaseSession) -> GoogleCalendarSyncResult:
    try:
        return google_calendar_sync_service.sync_google_calendar(db)
    except google_calendar_service.GoogleCalendarConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except google_calendar_service.GoogleCalendarNotConnectedError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
    except google_calendar_service.GoogleCalendarApiError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error


@router.get("/events", response_model=list[GoogleCalendarEventResponse])
def list_google_calendar_events(
    db: DatabaseSession,
) -> list[GoogleCalendarEventResponse]:
    return google_calendar_sync_service.get_active_google_events(db)
