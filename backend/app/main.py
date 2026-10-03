from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import init_database
from app.routes.tasks import router as tasks_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_database()
    yield


app = FastAPI(title="Personal Hub API", lifespan=lifespan)
app.include_router(tasks_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
