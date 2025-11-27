#!/bin/sh
set -e

echo "Running database migrations..."

cd /app/packages/db

bunx prisma generate

if [ ! -d "prisma/migrations" ]; then
  echo "WARNING: Migrations directory not found at prisma/migrations"
  echo "This may cause migration failures. Ensure migrations are included in the Docker image."
fi

if [ "$NODE_ENV" = "production" ]; then
  echo "Running migrations in production mode..."
  echo "Using 'prisma migrate deploy' - safe for production, will not reset database"

  if bunx prisma migrate deploy; then
    echo "Migrations applied successfully!"
  else
    echo "ERROR: Migration failed!"
    exit 1
  fi
else
  echo "Pushing schema in development mode..."
  bunx prisma db push
fi

echo "Migrations completed!"

