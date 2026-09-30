"""Alembic env.py — reads DATABASE_URL from environment or .env."""

import os
import sys
from logging.config import fileConfig

# Ensure /app is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import create_engine, pool

# Load .env file
load_dotenv()

from app.db.base import Base
from app.models.models import *  # noqa: F401, F403 — import models so Alembic sees them

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Override URL from environment if set
db_url = os.environ.get("DATABASE_URL", config.get_main_option("sqlalchemy.url"))

# Alembic needs sync driver URL
if "+aiosqlite" in db_url:
    db_url = db_url.replace("+aiosqlite", "")
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
elif "+psycopg_async" in db_url:
    db_url = db_url.replace("+psycopg_async", "+psycopg")


def run_migrations_offline() -> None:
    context.configure(url=db_url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(db_url, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
