#!/bin/sh
set -e

echo "Running database migrations..."

cd /app/packages/db

bunx prisma generate

if [ ! -d "prisma/migrations" ]; then
  echo "WARNING: Migrations directory not found at prisma/migrations"
  echo "This may cause migration failures. Ensure migrations are included in the Docker image."
fi

echo "Running migrations..."
echo "Using 'prisma migrate deploy' - safe for all environments, will not reset database"

if bunx prisma migrate deploy; then
  echo "Migrations applied successfully!"
else
  echo "ERROR: Migration failed!"
  exit 1
fi

echo "Migrations completed!"

