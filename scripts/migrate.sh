#!/bin/sh
set -e

echo "Running database migrations..."

# Wait for database to be ready
until bun run -e "import('pg').then(pg => { const client = new pg.Client({ connectionString: process.env.DATABASE_URL }); client.connect().then(() => { console.log('Database connected'); client.end(); process.exit(0); }).catch(() => process.exit(1)); }).catch(() => process.exit(1))" 2>/dev/null; do
  echo "Waiting for database..."
  sleep 2
done

# Generate Prisma client
cd /app/packages/db
bun run db:generate

# Push schema (for development) or run migrations (for production)
if [ "$NODE_ENV" = "production" ]; then
  echo "Running migrations in production mode..."
  bun run db:migrate || bun run db:push
else
  echo "Pushing schema in development mode..."
  bun run db:push
fi

echo "Migrations completed!"

