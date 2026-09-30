"""Dataset Request Desk — FastAPI application entry point."""

import logging
import sys

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.analytics import router as analytics_router
from app.api.auth import router as auth_router
from app.api.episodes import router as episodes_router
from app.api.health import router as health_router
from app.api.requests import router as requests_router
from app.api.users import router as users_router
from app.core.config import get_settings
from app.core.logging import AccessLogMiddleware

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","name":"%(name)s","message":"%(message)s"}',
    stream=sys.stdout,
)

settings = get_settings()

app = FastAPI(
    title="Dataset Request Desk",
    description="Internal platform for robotics dataset operations — request, assign, deliver, and review teleoperation episode datasets.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Comprehensive CORS configuration: allow localhost and 127.0.0.1 on all ports, plus configured origins
allowed_origins = list(settings.cors_origins_list)
for origin in [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost",
    "http://127.0.0.1",
]:
    if origin not in allowed_origins:
        allowed_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Structured access logging
app.add_middleware(AccessLogMiddleware)

# Routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(requests_router)
app.include_router(episodes_router)
app.include_router(analytics_router)
