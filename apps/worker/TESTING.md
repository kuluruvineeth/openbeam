# Worker Testing

## Run Tests

```bash
cd apps/worker
bun test
```

## Prerequisites

- Docker services running: `docker compose up -d postgres redis`
- Database migrated: `cd packages/db && bun run db:migrate`

## Test Files

- `tests/fencing.test.ts` - Exactly-once execution
- `tests/rate-limiting.test.ts` - Multi-level rate limiting
- `tests/priority-queue.test.ts` - Job prioritization
- `tests/database-schema.test.ts` - Schema validation

## Useful Commands

```bash
# Watch mode
bun test --watch

# Specific test file
bun test tests/fencing.test.ts

# Filter by name
bun test -t "rate limit"
```

## Troubleshooting

**DATABASE_URL not found?**
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/openplane" bun test
```

**Redis connection error?**
```bash
docker compose up -d redis
```
