# Connector Codebase Implementation Map (OpenBeam)

Date: February 28, 2026
Scope: Exact places to add integration and connector code in OpenBeam.

## 1. Canonical Connector Flow in This Repo

Connector lifecycle in current architecture:
1. App definition and auth metadata in `packages/integrations`.
2. Connector auth/client/sync/transformers in `packages/services`.
3. OAuth and setup endpoints in `apps/server/src/modules/integrations`.
4. Webhook endpoints in `apps/server/src/modules/webhooks` (if provider supports push).
5. Sync execution via Temporal `registerSyncFactory` in `packages/temporal`.
6. Connector listed in API/UI through `appStore` + apps routers.

This is the path to implement all new connectors.

## 2. File-by-File Additions for a New Connector

## 2.1 Shared types (`@openbeam/types`)

Add:
1. `packages/types/src/services/connectors/{connector}.ts`
2. Optional events schema: `packages/types/src/services/connectors/{connector}/events.ts`
3. Export from `packages/types/src/services/connectors/index.ts`

Use Zod-first contracts for:
- sync cursor
- transform context
- API entity shapes
- webhook payloads

## 2.2 Integration metadata (`packages/integrations`)

Create:
1. `packages/integrations/src/{connector}/config.ts`
2. `packages/integrations/src/{connector}/oauth.ts` or `auth.ts` (API key/service account)
3. `packages/integrations/src/{connector}/types.ts`
4. optional logo/assets under `packages/integrations/src/{connector}/assets`

Update:
1. `packages/integrations/src/index.ts` exports and `appStore`
2. `packages/integrations/src/logos.ts`
3. `packages/integrations/src/types.ts` if enum coverage is needed

Important check:
- Keep `AppType` consistency across `@openbeam/types`, `@openbeam/integrations`, and Prisma.

## 2.3 Service implementation (`packages/services`)

Create:
1. `packages/services/src/{connector}/auth.ts`
2. `packages/services/src/{connector}/client.ts`
3. `packages/services/src/{connector}/types.ts`
4. `packages/services/src/{connector}/api/*.ts`
5. `packages/services/src/{connector}/sync/full.ts`
6. `packages/services/src/{connector}/sync/incremental.ts`
7. `packages/services/src/{connector}/transformers/*.ts`
8. Optional push path: `packages/services/src/{connector}/push/*`

Update:
1. `packages/services/src/{connector}/index.ts`
2. `packages/services/src/index.ts`

Implementation rules:
- use provider rate limits and backoff
- support incremental sync where possible
- include discovered resources callbacks
- normalize to `GenericDocument`

## 2.4 Server integration modules (`apps/server`)

Create:
1. `apps/server/src/modules/integrations/{connector}/{connector}.schema.ts`
2. `apps/server/src/modules/integrations/{connector}/{connector}.routes.ts`
3. `apps/server/src/modules/integrations/{connector}/{connector}.handlers.ts`
4. `apps/server/src/modules/integrations/{connector}/{connector}.index.ts`

Update:
1. `apps/server/src/modules/integrations/integrations.index.ts`

If webhook-capable, add:
1. `apps/server/src/modules/webhooks/{connector}.ts`
2. register in `apps/server/src/modules/webhooks/webhooks.index.ts`

## 2.5 Temporal sync registration (`packages/temporal`)

Primary integration point:
- `packages/temporal/src/activities/connectors/sync-registry.ts`

Actions:
1. Add `registerSyncFactory("{CONNECTOR}", async function* ... )`.
2. Build connector client/auth/token resolution.
3. Feed `fullSync` or `incrementalSync` generators.
4. Yield `items`, `cursor`, `hasMore`, and `discoveredResources`.
5. Remove placeholder factories when real implementation lands.

Supporting files:
- `packages/temporal/src/activities/connectors/unified-fetch-batch.ts`
- `packages/temporal/src/workflows/sync/connector-sync.ts`

## 2.6 API/UI surfacing

No connector-specific router is required for base listing if `appStore` and enums are correct.

Check these consumers:
1. `packages/api/src/routers/apps/connectors.ts`
2. `packages/api/src/routers/apps/schemas.ts`
3. `apps/web/src/components/integrations/*`
4. `apps/web/src/features/connectors/components/*`

## 3. Gap to fix before rapid expansion

## 3.1 Enum drift risk

Current state:
- Prisma `AppType` is broad.
- `@openbeam/types` `AppTypeSchema` is broad (partial vs Prisma).
- `@openbeam/integrations` local `AppType` enum currently lists only a small subset.

Plan:
1. Normalize enum source of truth to `@openbeam/types`.
2. Remove or reduce local enum duplication in integrations package.
3. Add CI check that enum values are consistent across packages.

## 3.2 Placeholder sync factories

Replace placeholders for:
1. JIRA
2. CONFLUENCE
3. ZENDESK

This is the fastest high-impact connector delivery path.

## 4. Testing Matrix Per Connector

For each connector add:
1. auth success/failure tests
2. full sync batch tests
3. incremental cursor progression tests
4. transformer correctness tests
5. webhook signature tests (if applicable)
6. ACL and permission mapping tests

Recommended anchor test locations:
- `packages/services/src/{connector}/__tests__/*`
- `packages/temporal/src/__tests__/connector-activities.test.ts`
- `apps/server/src/modules/webhooks/__tests__/*`

## 5. Operational Readiness Checklist (per connector)

1. sync freshness metric emitted
2. rate-limit backoff verified
3. auth refresh path verified
4. error classification and retry policy defined
5. discovered resources appear in connector resources UI
6. sample queries validate citation quality

## 6. Use of `.claude` connector assets

Use as implementation templates:
1. `.claude/rules/connectors.md`
2. `.claude/commands/connector.md`
3. `.claude/commands/oauth.md`
4. `.claude/commands/api-key-auth.md`
5. `.claude/commands/sync.md`
6. `.claude/agents/connector-builder.md`

Guardrail:
- Treat these as templates, then align to the live architecture where Temporal owns sync orchestration.

## 7. Delivery sequence template (for any connector)

1. Types contracts
2. Integration config and auth metadata
3. Service client + sync + transformers
4. Server OAuth/webhook module
5. Temporal sync registration
6. Tests and observability
7. Pilot tenant validation

Do not reorder this sequence unless there is a hard external dependency.
