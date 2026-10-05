from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import RedirectResponse

from app.schemas.google_calendar import (
    GoogleCalendarConnectionResponse,
    GoogleCalendarDisconnectResponse,
    GoogleCalendarStatus,
)
from app.services import google_calendar_service

router = APIRouter(prefix="/integrations/google-calendar", tags=["google-calendar"])


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
