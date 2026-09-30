#!/bin/bash
# Entrypoint script: run migrations, seed data, then start server.
set -e

echo "Running migrations..."
cd /app
alembic upgrade head

echo "Seeding database..."
python -m scripts.seed

echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
