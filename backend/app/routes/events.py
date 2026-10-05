from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.event import EventCreate, EventResponse, EventUpdate
from app.services import event_service

router = APIRouter(prefix="/events", tags=["events"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[EventResponse])
def list_events(db: DatabaseSession) -> list[EventResponse]:
    return event_service.get_events(db)


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(event_data: EventCreate, db: DatabaseSession) -> EventResponse:
    return event_service.create_event(db, event_data)


@router.patch("/{id}", response_model=EventResponse)
def update_event(id: int, event_data: EventUpdate, db: DatabaseSession) -> EventResponse:
    event = event_service.get_event(db, id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    updates = event_data.model_dump(exclude_unset=True)
    start_time = updates.get("start_time") or event.start_time
    end_time = updates.get("end_time") or event.end_time
    if end_time <= start_time:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="end_time must be after start_time",
        )

    return event_service.update_event(db, event, event_data)


@router.delete("/{id}")
def delete_event(id: int, db: DatabaseSession) -> dict[str, str]:
    event = event_service.get_event(db, id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    event_service.delete_event(db, event)
    return {"status": "deleted"}
