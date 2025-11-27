#!/bin/sh
set -e

echo "Running database migrations..."

cd /app/packages/db

bunx prisma generate

if [ ! -d "prisma/migrations" ]; then
  echo "WARNING: Migrations directory not found at prisma/migrations"
  echo "This may cause migration failures. Ensure migrations are included in the Docker image."
fi

echo "Checking migration status..."

# Check if database needs baselining (P3005 error)
if bunx prisma migrate status 2>&1 | grep -q "P3005"; then
  echo "Database schema exists but has no migration history. Baselining..."
  echo "Marking all existing migrations as applied without running them."

  # Get all migration directories (excluding _lock)
  for migration in $(ls -1 prisma/migrations | grep -v "^_"); do
    echo "Resolving migration: $migration"
    if ! bunx prisma migrate resolve --applied "$migration"; then
      echo "ERROR: Failed to baseline migration $migration"
      exit 1
    fi
  done

  echo "Database baselined successfully!"
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

