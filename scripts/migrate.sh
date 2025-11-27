#!/bin/sh
set -e

echo "Running database migrations..."

# Wait for database to be ready
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if bun -e "import('pg').then(async (pg) => { const client = new pg.default.Client({ connectionString: process.env.DATABASE_URL }); await client.connect(); console.log('Database connected'); await client.end(); process.exit(0); }).catch((err) => { console.error('Connection failed:', err.message); process.exit(1); })"; then
    echo "Database connection successful"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Waiting for database... (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "ERROR: Failed to connect to database after $MAX_RETRIES attempts"
  exit 1
fi

# Generate Prisma client
cd /app/packages/db

# Use bunx to run prisma generate (works even if prisma is devDependency)
bunx prisma generate

# Verify migrations directory exists
if [ ! -d "prisma/migrations" ]; then
  echo "WARNING: Migrations directory not found at prisma/migrations"
  echo "This may cause migration failures. Ensure migrations are included in the Docker image."
fi

# Run migrations based on environment
if [ "$NODE_ENV" = "production" ]; then
  echo "Running migrations in production mode..."
  echo "Using 'prisma migrate deploy' - safe for production, will not reset database"
  
  # Use migrate deploy which is safe for production
  # It only applies pending migrations and will not cause data loss
  # Unlike 'migrate dev', this will NEVER reset the database
  # Using bunx ensures prisma CLI is available even if it's a devDependency
  if bunx prisma migrate deploy; then
    echo "Migrations applied successfully!"
  else
    echo "ERROR: Migration failed!"
    echo "This could indicate:"
    echo "  1. Migration files are missing or out of sync"
    echo "  2. Database schema is in an inconsistent state"
    echo "  3. Migration history mismatch between code and database"
    echo ""
    echo "Please check:"
    echo "  - Ensure all migration files are present in packages/db/prisma/migrations/"
    echo "  - Verify migration history matches between local and production"
    echo "  - Do NOT use 'db:push' in production as it can cause data loss"
    exit 1
  fi
else
  echo "Pushing schema in development mode..."
  bunx prisma db push
fi

echo "Migrations completed!"

