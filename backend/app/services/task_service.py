from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate


def get_tasks(db: Session) -> list[Task]:
    return list(db.scalars(select(Task).order_by(Task.id)).all())


def get_task(db: Session, task_id: int) -> Task | None:
    return db.get(Task, task_id)


def create_task(db: Session, task_data: TaskCreate) -> Task:
    task = Task(**task_data.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task: Task, task_data: TaskUpdate) -> Task:
    updates = task_data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        if value is not None or field == "due_date":
            setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task: Task) -> None:
    db.delete(task)
    db.commit()
