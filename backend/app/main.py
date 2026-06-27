from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import engine, Base
from app.core.limiter import limiter
from app.routes.auth import router as auth_router
from app.routes.bookmarks import router as bookmarks_router
from app.routes.categories import router as categories_router
from app.routes.conversations import router as conversation_router
from app.routes.posts import router as posts_router
from app.routes.comments import router as comments_router
from app.routes.search import router as search_router
from app.routes.users import router as users_router
from app.routes.notifications import router as notifications_router
from app.routes.admin import router as admin_router
from app.routes.reports import router as reports_router
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AI答研所 API server...")
    Base.metadata.create_all(bind=engine)
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="AI答研所 API",
    description="AI 回答的探讨与验证社区",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(bookmarks_router)
app.include_router(categories_router)
app.include_router(conversation_router)
app.include_router(posts_router)
app.include_router(comments_router)
app.include_router(search_router)
app.include_router(users_router)
app.include_router(notifications_router)
app.include_router(admin_router)
app.include_router(reports_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
