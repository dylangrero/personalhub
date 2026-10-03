from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from app.services import task_service

router = APIRouter(prefix="/tasks", tags=["tasks"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[TaskResponse])
def list_tasks(db: DatabaseSession) -> list[TaskResponse]:
    return task_service.get_tasks(db)


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task_data: TaskCreate, db: DatabaseSession) -> TaskResponse:
    return task_service.create_task(db, task_data)


@router.patch("/{id}", response_model=TaskResponse)
def update_task(id: int, task_data: TaskUpdate, db: DatabaseSession) -> TaskResponse:
    task = task_service.get_task(db, id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    return task_service.update_task(db, task, task_data)


@router.delete("/{id}")
def delete_task(id: int, db: DatabaseSession) -> dict[str, str]:
    task = task_service.get_task(db, id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    task_service.delete_task(db, task)
    return {"status": "deleted"}
