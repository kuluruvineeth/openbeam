# Connector Expansion Benchmark Plan (OpenBeam vs Onyx)

Date: February 28, 2026
Scope: Decide whether to expand connectors now, and in what order.

## 1. Executive Decision

Yes, expand connectors. Do it in focused waves tied to the Engineering Ops vertical, not a broad connector land-grab.

Reason:
1. Onyx has materially broader connector coverage in open source (48 connector directories in `backend/onyx/connectors`, excluding utility/test folders).
2. OpenBeam currently exposes 6 connectors in `appStore`.
3. OpenBeam already has placeholder sync registrations for `JIRA`, `CONFLUENCE`, and `ZENDESK`, which creates a high-leverage path to expand quickly.

## 2. External Benchmark (Onyx GitHub)

Primary source:
- https://github.com/onyx-dot-app/onyx/tree/main/backend/onyx/connectors
- https://raw.githubusercontent.com/onyx-dot-app/onyx/main/backend/onyx/connectors/registry.py
- https://raw.githubusercontent.com/onyx-dot-app/onyx/main/backend/onyx/connectors/README.md

Observed in Onyx repository:
1. Connector framework supports load, poll, slim, and event-based patterns.
2. Connectors are centrally registered in a connector registry/factory.
3. Broad connector breadth across engineering, docs, ITSM, CRM, and collaboration systems.

Implication for OpenBeam:
- Breadth is now a buyer expectation baseline.
- OpenBeam should not copy breadth-first strategy immediately.
- OpenBeam should copy the disciplined connector factory + testing rigor, while staying vertical-first.

## 3. Current OpenBeam Reality

## 3.1 Live connector surface

OpenBeam `appStore` currently includes:
1. Slack
2. Gmail
3. Google Drive
4. Notion
5. Linear
6. GitHub

Code anchors:
- `packages/integrations/src/index.ts`
- `packages/services/src/{slack,gmail,google-drive,notion,linear,github}`

## 3.2 Placeholder gap in sync layer

`sync-registry.ts` currently has placeholders:
1. `registerSyncFactory("JIRA", createEmptySyncGenerator)`
2. `registerSyncFactory("CONFLUENCE", createEmptySyncGenerator)`
3. `registerSyncFactory("ZENDESK", createEmptySyncGenerator)`

Code anchor:
- `packages/temporal/src/activities/connectors/sync-registry.ts`

## 3.3 Enum and architecture headroom already exists

Prisma `AppType` already includes many apps beyond currently implemented connectors, so model-level expansion is not blocked.

Code anchor:
- `packages/db/prisma/schema/integrations.prisma`

## 4. Expansion Strategy: Focused Waves

Use this prioritization score:
- `Score = 0.40*ICPCoverage + 0.30*DealBlocker + 0.20*ImplementationLeverage + 0.10*MaintenanceComplexityInverse`

Where:
1. ICPCoverage: fit to EngOps target accounts.
2. DealBlocker: frequency in lost deals as "must-have".
3. ImplementationLeverage: reuse from existing auth/sync/transformer patterns.
4. MaintenanceComplexityInverse: lower ongoing API volatility = higher score.

## 4.1 Wave 1 (now): close obvious blockers

1. Jira
2. Confluence
3. Zendesk

Why first:
- Already scaffolded as placeholders in sync registry.
- High enterprise demand for incident/release/decision workflows.
- Strong alignment with your current one-vertical plan.

## 4.2 Wave 2 (after Wave 1 quality gates)

1. GitLab
2. Microsoft Teams
3. SharePoint

Why second:
- Unlocks Microsoft-heavy and GitLab-heavy engineering orgs.
- Expands enterprise applicability without losing EngOps focus.

## 4.3 Wave 3 (only if pilot pull is real)

1. Bitbucket
2. ClickUp or Asana (pick one based on design-partner demand)
3. ServiceNow (if enterprise support workflow is strategic)

## 5. Non-Negotiable Gating Rules

Before adding any connector beyond Wave 1:
1. Existing connector sync freshness SLA is stable.
2. Permission correctness suite passes for all existing connectors.
3. Citation trust metrics are stable in pilot tenants.
4. Incident Context Pack and Release Readiness workflows show retention.

Do not ship connector breadth at the cost of trust and reliability.

## 6. `.claude` assets to use as accelerators

Use these internal assets:
1. `.claude/rules/connectors.md`
2. `.claude/commands/connector.md`
3. `.claude/commands/oauth.md`
4. `.claude/commands/api-key-auth.md`
5. `.claude/commands/sync.md`
6. `.claude/agents/connector-builder.md`

Important adaptation:
- Some command docs mention `apps/worker/src/connectors/*`, but current OpenBeam sync execution is centered in Temporal activities + `sync-registry.ts`. Apply the architecture as implemented, not older template assumptions.

## 7. Outcome Targets (next 90 days)

1. Move from 6 to 9 production-grade connectors.
2. Remove all placeholder sync factories from registry.
3. Achieve at least 2 paid pilot accounts where new connectors are active and used weekly.
4. Publish one connector reliability report with freshness, error-rate, and permission-test metrics.

## 8. Go / No-Go Summary

Go on connector expansion if and only if:
1. It remains vertical-first (Engineering Ops).
2. Wave 1 ships with quality gates and measurable customer usage.
3. Roadmap discipline is enforced (no random connector requests without scoring).

No-go on breadth-first expansion without proof of operational reliability.
