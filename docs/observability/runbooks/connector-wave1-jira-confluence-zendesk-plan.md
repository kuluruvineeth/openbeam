# Connector Wave 1 Plan: Jira + Confluence + Zendesk

Date: February 28, 2026
Scope: Implement the three placeholder connectors already registered in OpenBeam sync layer.

## 1. Objective

Ship production-grade Jira, Confluence, and Zendesk connectors in one wave to unblock Engineering Ops workflows:
1. Incident Context Pack
2. Release Readiness Brief
3. Decision Memory

Current blocker:
- `sync-registry.ts` still uses empty generators for these 3 connector types.

## 2. Why this exact Wave 1

1. Existing placeholders reduce integration friction.
2. High buyer frequency in enterprise engineering orgs.
3. Direct fit to your one-vertical strategy (release, incident, and decision workflows).

## 3. Scope by Connector

## 3.1 Jira

Ingest entities:
1. issues
2. issue comments
3. projects
4. issue links
5. optional: sprints/epics if available through API scope

Sync strategy:
1. full sync by project scope
2. incremental by `updated` timestamp
3. permission mapping by project and issue visibility metadata

Auth modes:
1. Jira Cloud OAuth2
2. Jira API token (phase 1.1 fallback)

Key outputs:
- blocker detection for release briefs
- incident links from ticket timelines

## 3.2 Confluence

Ingest entities:
1. pages
2. blog posts
3. comments
4. spaces

Sync strategy:
1. full crawl by selected spaces
2. incremental by `lastModified`
3. permission metadata for space/page restrictions

Auth modes:
1. OAuth2 for cloud
2. API token/basic for enterprise fallback

Key outputs:
- decision records and RFC context for Decision Memory
- runbooks and postmortems for incident context

## 3.3 Zendesk

Ingest entities:
1. tickets
2. ticket comments
3. help center articles
4. organizations/users metadata (as reference)

Sync strategy:
1. full sync for selected groups/views
2. incremental by `updated_at`
3. visibility controls by group/org constraints

Auth modes:
1. API token + email
2. OAuth optional in phase 2

Key outputs:
- customer impact signals during incidents
- release risk signals from support escalations

## 4. Technical Work Breakdown

## 4.1 Types and contracts

Add connector contracts in `@openbeam/types`:
1. `packages/types/src/services/connectors/jira.ts`
2. `packages/types/src/services/connectors/confluence.ts`
3. `packages/types/src/services/connectors/zendesk.ts`

Include:
- cursor schema
- API entity schemas
- transform context
- optional webhook schemas

## 4.2 Integration package work

Create in `packages/integrations/src/`:
1. `jira/`
2. `confluence/`
3. `zendesk/`

For each:
1. `config.ts`
2. `oauth.ts` or `auth.ts`
3. `types.ts`
4. `assets/logo`

Update:
- `packages/integrations/src/index.ts`
- `packages/integrations/src/logos.ts`

## 4.3 Services package work

For each connector create `packages/services/src/{connector}/`:
1. `auth.ts`
2. `client.ts`
3. `api/*`
4. `sync/full.ts`
5. `sync/incremental.ts`
6. `transformers/*`
7. optional `push/*`
8. `index.ts`

Then update `packages/services/src/index.ts` exports.

## 4.4 Server integration routes

For each connector add:
1. `apps/server/src/modules/integrations/{connector}/{connector}.schema.ts`
2. `...routes.ts`
3. `...handlers.ts`
4. `...index.ts`

Register in:
- `apps/server/src/modules/integrations/integrations.index.ts`

Add webhooks only where provider APIs support and where ROI is immediate.

## 4.5 Temporal sync activation

In `packages/temporal/src/activities/connectors/sync-registry.ts`:
1. replace empty Jira factory with real generator
2. replace empty Confluence factory with real generator
3. replace empty Zendesk factory with real generator

Make each generator emit:
1. `items`
2. `cursor`
3. `hasMore`
4. `discoveredResources`

## 5. Sprint Plan (6 weeks)

## Week 1

1. Finalize schemas and auth decisions for all 3 connectors.
2. Set up integration configs and server endpoints.
3. Build minimal API clients.

## Week 2

1. Jira full sync + transformers.
2. Jira incremental sync + cursor tests.
3. Jira sync factory activation.

## Week 3

1. Confluence full sync + transformers.
2. Confluence incremental sync.
3. Confluence sync factory activation.

## Week 4

1. Zendesk full sync + transformers.
2. Zendesk incremental sync.
3. Zendesk sync factory activation.

## Week 5

1. Permission mapping hardening across all three.
2. Connector resource discovery and UI validation.
3. Reliability and rate-limit tuning.

## Week 6

1. Pilot tenant rollout and bug fixes.
2. End-to-end workflow validation for incident/release/decision outputs.
3. Publish readiness report and decide Wave 2.

## 6. Definition of Done (per connector)

1. OAuth/API-key auth flow works in UI.
2. Full sync produces searchable docs.
3. Incremental sync catches updates without duplicates.
4. Permission filters block unauthorized retrieval.
5. Resource discovery is visible and toggleable.
6. Connector health metrics and error handling are wired.

## 7. Risks and Mitigations

1. API rate limits
- Mitigation: connector-specific limit policies and backoff.

2. Permission edge cases
- Mitigation: project/space/group scoped ACL tests before pilot.

3. Inconsistent data models across cloud vs self-hosted
- Mitigation: cloud-first scope in Wave 1; self-hosted support as optional extension.

4. Scope creep
- Mitigation: block non-Wave-1 connector work until quality gates pass.

## 8. Quality Gates Before Wave 2

1. all three connectors pass typecheck + tests
2. sync success rate >= 95% in pilot tenants
3. freshness SLA met for weekly production usage
4. no permission leakage incidents
5. incident/release workflows show measurable user adoption

## 9. Execution Accelerators

Use these internal templates while implementing:
1. `.claude/rules/connectors.md`
2. `.claude/commands/connector.md`
3. `.claude/commands/oauth.md`
4. `.claude/commands/api-key-auth.md`
5. `.claude/commands/sync.md`
6. `.claude/agents/connector-builder.md`

Adaptation note:
- Follow current Temporal-centered sync architecture, not older worker-specific template assumptions.

## 10. Success Metric Summary

Wave 1 is successful only if:
1. Jira, Confluence, Zendesk are all live and stable.
2. At least two pilot customers use these connectors in weekly workflows.
3. Release and incident artifacts show clear quality lift from newly ingested data.
