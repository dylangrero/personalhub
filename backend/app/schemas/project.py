from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.project import ProjectStatus


class ProjectCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    status: ProjectStatus = ProjectStatus.PLANNING
    progress: int = Field(default=0, ge=0, le=100)
    next_action: str = Field(min_length=1, max_length=255)
    deadline: date | None = None


class ProjectUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1)
    status: ProjectStatus | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    next_action: str | None = Field(default=None, min_length=1, max_length=255)
    deadline: date | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    status: ProjectStatus
    progress: int
    next_action: str
    deadline: date | None
    created_at: datetime
