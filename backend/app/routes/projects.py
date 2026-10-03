from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.services import project_service

router = APIRouter(prefix="/projects", tags=["projects"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[ProjectResponse])
def list_projects(db: DatabaseSession) -> list[ProjectResponse]:
    return project_service.get_projects(db)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project_data: ProjectCreate, db: DatabaseSession) -> ProjectResponse:
    return project_service.create_project(db, project_data)


@router.patch("/{id}", response_model=ProjectResponse)
def update_project(id: int, project_data: ProjectUpdate, db: DatabaseSession) -> ProjectResponse:
    project = project_service.get_project(db, id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    return project_service.update_project(db, project, project_data)


@router.delete("/{id}")
def delete_project(id: int, db: DatabaseSession) -> dict[str, str]:
    project = project_service.get_project(db, id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    project_service.delete_project(db, project)
    return {"status": "deleted"}
