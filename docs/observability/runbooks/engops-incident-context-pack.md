# EngOps Runbook 01: Incident Context Pack

Date: February 28, 2026
Scope: Pain Point 1 - Incident context is fragmented across Slack/GitHub/Linear/Notion/Drive.

## 1. Product Definition

Incident Context Pack is a generated artifact for an incident channel, ticket, or keyword query that answers:

1. What happened, and in what order?
2. What systems/users are likely impacted?
3. What are likely root-cause candidate links?
4. What actions are still open, and who owns them?

Output format must be deterministic JSON plus a rendered markdown report.

## 2. Why OpenBeam Can Ship This Quickly

Existing components already cover most primitives:
- Connector ingestion and incremental sync (`packages/temporal/src/workflows/sync/connector-sync.ts`).
- Multi-agent incident template in Mission Control (`apps/web/src/features/mission-control/components/create/template-picker.tsx`).
- Hybrid retrieval + citations + grounding (`packages/services/src/ai/rag/orchestrator.ts`).
- Approval and safety hooks (`packages/ai/src/tools/hooks.ts`).

Gaps:
- No dedicated incident API contract.
- No canonical event model across connectors.
- No packaged incident timeline + blast-radius scorer.

## 3. Implementation Blueprint (Pin-to-Pin)

## 3.1 Shared types (first)

Create shared contracts in `@openbeam/types`:

1. `packages/types/src/services/incidents/context-pack.ts`
- `IncidentSourceRef`
- `IncidentEvent`
- `IncidentTimeline`
- `BlastRadiusEstimate`
- `RootCauseCandidate`
- `ActionItem`
- `IncidentContextPack`

2. `packages/types/src/api/incidents.ts`
- Zod schemas for request/response.
- `createIncidentContextPackInputSchema`.
- `incidentContextPackStatusSchema`.

Design constraints:
- All evidence links contain `documentId`, `connectorType`, `sourceUrl`, `snippet`, `score`.
- Every assertion field in final output has citation references (`citationIds: string[]`).

## 3.2 Data model (minimal first)

Add Prisma table for generated packs:

1. `packages/db/prisma/schema/incident-context.prisma`
- `IncidentContextPackRecord`
- fields: `id`, `teamId`, `incidentKey`, `status`, `input`, `packJson`, `createdById`, `createdAt`, `updatedAt`, `completedAt`, `error`.

2. Indexes:
- `(teamId, incidentKey, createdAt DESC)`
- `(teamId, status, createdAt DESC)`

Do not denormalize source documents. Store references to indexed docs IDs and connector metadata only.

## 3.3 API router

Create `packages/api/src/routers/incidents.ts`:

Endpoints:
1. `createContextPack`
- validates incident key + time window + optional connector filters.
- resolves permissions with `resolvePermissions` (not manual ACL list).
- starts Temporal workflow.

2. `getContextPack`
- returns latest pack by id.

3. `listContextPacks`
- cursor pagination.

4. `cancelContextPack`
- cancels running workflow.

5. `rerunContextPack`
- starts fresh run with prior settings.

Then register router in API root.

## 3.4 Temporal workflow

Create workflow in `packages/temporal/src/workflows/incident/incident-context-pack.ts`:

Step graph:
1. `loadIncidentSeed`
- ingest incident key, channel, time window.

2. `collectEvidence`
- calls search activities per connector in parallel with capped fan-out.

3. `normalizeEvents`
- maps connector-specific docs into canonical `IncidentEvent`.

4. `buildTimeline`
- sorts and clusters events.

5. `estimateBlastRadius`
- entity extraction + dependency references.

6. `rankRootCauseCandidates`
- weighted scoring from error spikes, code changes, incident thread signals.

7. `buildActionItems`
- unresolved ticket/PR/comment extraction.

8. `composePack`
- LLM synthesis with citations and grounding check.

9. `persistAndPublish`
- store JSON pack and publish mission artifact.

Use Temporal signals:
- `pauseSignal`
- `resumeSignal`
- `cancelSignal`

Use `continueAsNew` when event count/history size grows.

## 3.5 Activities layer

Create activities under `packages/temporal/src/activities/incidents/`:

1. `search-incident-evidence.ts`
2. `normalize-incident-events.ts`
3. `compute-blast-radius.ts`
4. `score-root-cause.ts`
5. `generate-context-pack.ts`
6. `save-context-pack.ts`

Rules:
- external IO only in activities.
- strict timeouts and retries.
- non-retryable for auth/permission errors.

## 3.6 Search and permission correctness

Current `search` and `rag` routers build minimal ACL arrays. Replace that path with resolver-based IDs:

- Import `resolvePermissions` from `packages/services/src/permissions/resolver.ts` in:
  - `packages/api/src/routers/search.ts`
  - `packages/api/src/routers/rag.ts`

Expected behavior:
- include `user:*`, `email:*`, `group:*`, `team:*`, and `domain:*` scopes.
- preserve team-admin bypass semantics.

This is mandatory before incident packs are trusted.

## 3.7 UI surface

Add feature page:
- `apps/web/src/features/incidents/` with:
  - context pack create form
  - run status timeline
  - report view with cited sections
  - export to markdown

Entry points:
- Mission template action: "Generate Incident Context Pack".
- Optional Slack deep link to existing incident channel message.

## 4. Swarm Role Design for Incident Pack

Run these specialized agents in order:

1. `incident-collector`
- Pull raw evidence from connectors.

2. `incident-correlator`
- Build timeline and cluster related events.

3. `impact-estimator`
- Estimate blast radius and affected customer segments.

4. `root-cause-scout`
- Rank probable causes with confidence.

5. `action-curator`
- Extract and de-duplicate action items.

6. `citation-auditor`
- Validate every claim has supporting evidence.

7. `incident-commander`
- Produce final pack artifact and recommendations.

Map this to Mission Control agent runtime, not ad-hoc scripts.

## 5. Scoring Model

## 5.1 Root cause score (example)

`score = 0.35*temporal_proximity + 0.25*error_overlap + 0.20*change_intensity + 0.10*discussion_signal + 0.10*dependency_correlation`

Where:
- `temporal_proximity`: event distance from incident start.
- `error_overlap`: stacktrace/log keyword overlap.
- `change_intensity`: PR diff/release volume around window.
- `discussion_signal`: confidence from incident thread references.
- `dependency_correlation`: service map adjacency.

## 5.2 Blast radius score

`blast = affected_services_weight + customer_tier_weight + SLA_breach_weight + regional_scope_weight`

Outputs severity bucket:
- `SEV1`, `SEV2`, `SEV3`, `SEV4`

## 6. Test Plan (Required)

1. Type-level contract tests in `packages/types`.
2. API integration tests for create/get/list/cancel flows.
3. Temporal workflow tests for:
- success path
- permission failure
- timeout/retry behavior
- continue-as-new path
4. Grounding tests:
- unsupported claim must be downgraded or refused.
5. Tenant isolation tests:
- cross-team document leakage must be impossible.

Suggested commands:
- `bun run check-types`
- `bun test packages/temporal/src/__tests__/connector-activities.test.ts`
- targeted new tests under incident workflow package.

## 7. Operational KPIs

1. Context assembly time (target p95 < 120s).
2. Citation completeness (target >= 95% claims cited).
3. Commander prep time reduction (target 30-60 min saved/incident).
4. MTTR delta (target 15-25% improvement for pilot teams).

## 8. Rollout Plan

1. Week 1-2: schema + router + workflow skeleton.
2. Week 3-4: evidence normalization + scoring + first report quality loop.
3. Week 5-6: UI + export + Slack workflow glue.
4. Week 7-8: pilot hardening + trust metrics + case study capture.

## 9. External Research and Constraints

- Slack non-Marketplace rate limits require careful background sync + caching design.  
  https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps/
- Linear API rate limits require bounded query plans for incident windows.  
  https://linear.app/developers/rate-limiting
- Temporal best practices for deterministic workflows and activity timeouts apply directly.  
  https://docs.temporal.io/workflow-definition
- GitHub PR/issue metadata is rich enough to support release and incident correlation with citations.  
  https://docs.github.com/rest

## 10. Done Criteria

Incident Context Pack is "shippable" only when:

1. Pack is generated in under 2 minutes median on pilot tenant.
2. Every major section includes evidence links.
3. Permission correctness tests pass for group/domain-scoped docs.
4. Incident commanders use it in at least 3 live incidents and retain usage.
