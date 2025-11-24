# Admin Module

Queue management and administrative tools.

## Features

- **BullBoard Integration**: Real-time queue monitoring UI
- **Authentication**: Email-based admin whitelist
- **Queues Monitored**: sync, index, webhook, cleanup

## Setup

Add admin emails to your `.env`:

```bash
ADMIN_EMAILS="admin@example.com,devops@example.com"
```

## Accessing BullBoard

Once the server is running, navigate to:

```
http://localhost:3000/admin/queues
```

You must be:

1. Authenticated (session or API key)
2. Listed in `ADMIN_EMAILS` environment variable

## Architecture

- `admin.index.ts` - Main router with authentication middleware
- `admin.handlers.ts` - BullBoard setup and configuration

## Tech Stack

- **@bull-board/api** - Core BullBoard library
- **@bull-board/hono** - Hono adapter for BullBoard
- **hono/bun** - Bun-specific static file serving
