from app.routes.events import router as events_router
from app.routes.projects import router as projects_router
from app.routes.tasks import router as tasks_router
from app.routes.today import router as today_router

__all__ = ["events_router", "projects_router", "tasks_router", "today_router"]
