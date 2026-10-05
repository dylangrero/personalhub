from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.event import Event
from app.schemas.event import EventCreate, EventUpdate


def get_events(db: Session) -> list[Event]:
    return list(db.scalars(select(Event).order_by(Event.start_time, Event.id)).all())


def get_event(db: Session, event_id: int) -> Event | None:
    return db.get(Event, event_id)


def create_event(db: Session, event_data: EventCreate) -> Event:
    event = Event(**event_data.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def update_event(db: Session, event: Event, event_data: EventUpdate) -> Event:
    updates = event_data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        if value is not None or field in {"description", "location"}:
            setattr(event, field, value)

    db.commit()
    db.refresh(event)
    return event


def delete_event(db: Session, event: Event) -> None:
    db.delete(event)
    db.commit()
