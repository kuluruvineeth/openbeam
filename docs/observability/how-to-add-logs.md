# How To Add Logs

## 1. Use structured logging
Always log JSON objects with stable keys.

TypeScript services should use `@openplane/observability` logger utilities so request context is attached automatically.

```ts
import { createLogger } from "@openplane/observability";

const logger = createLogger({ service: "openplane-server" });

logger.info(
  {
    route: "/api/v1/search",
    method: "GET",
    status_code: 200,
    duration_ms: 42,
  },
  "request_completed"
);
```

## 2. Prefer event-style log messages
Use an event key as message text and place details in fields.

- Good: `"connector_sync_failed"` + `{ connector_id, provider, error_code }`
- Avoid: prose-only messages that are hard to query consistently.

## 3. Keep sensitive data out of logs
Never log:
- access tokens
- passwords
- cookies
- raw PII payloads

Use redaction helpers when uncertain.

## 4. Add typed log helper for new event
Generate a validated helper:

```bash
bun run observability:new-log-event -- --event connector_sync_failed --fields connector_id:string,team_id:string,error_code:string --level error --out packages/services/src/observability/log-connector-sync-failed.ts
```

The generated helper:
- validates payload via Zod
- emits structured JSON fields
- logs at explicit level (`info|warn|error|debug`)

## 5. Verify in Loki
- Open `Logs Error Drilldown` dashboard.
- Filter by `service` and `env`.
- Confirm fields like `trace_id` and `request_id` are visible.
