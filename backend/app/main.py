import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)

logger = logging.getLogger("shadowbuilder.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ShadowBuilder AI Backend initialized.")
    logger.info(f"Configuration summary: {settings.safe_summary()}")
    yield
    logger.info("ShadowBuilder AI Backend shutting down.")


app = FastAPI(
    title="ShadowBuilder AI API",
    description="Competitor intelligence and safe engineering agent API",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [
    settings.frontend_origin,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.backend_host, port=settings.backend_port, reload=True)
