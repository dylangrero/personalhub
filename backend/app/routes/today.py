from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.today import TodayResponse
from app.services import today_service

router = APIRouter(tags=["today"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("/today", response_model=TodayResponse)
def get_today(
    db: DatabaseSession,
    requested_date: Annotated[date | None, Query(alias="date")] = None,
) -> TodayResponse:
    return today_service.get_today(db, requested_date or date.today())
