# OpenBeam Engineering Ops Vertical Master Plan

Date: February 28, 2026
Owner: Product + Platform + GTM

## 1. One-Vertical Decision

**Vertical to win first:** Engineering Operations for B2B SaaS teams (50-600 engineers).

**Primary buyer:** VP Engineering / Head of Platform.

**Champion:** Engineering Productivity / Incident Manager / Release Manager.

**Wedge outcome:**
- Resolve incidents faster with a citation-backed Incident Context Pack.
- Ship safer with a Release Readiness Brief before every release cut.
- Preserve architectural and product rationale with Decision Memory.
- Execute actions safely with approval gates and permission-correct automation.

This is not a generic "AI assistant" launch. It is an engineering operations execution product.

## 2. Why This Vertical (Research + Market Reality)

### 2.1 Agent demand is concentrated here

Anthropic's February 18, 2026 deployment study shows software engineering is the dominant domain in agentic tool usage (nearly 50% of tool calls), with long-tail usage in other domains.

### 2.2 Reliability favors bounded workflows

Anthropic and METR both indicate strong capability growth, but production-grade autonomy still needs strong oversight, interruption paths, and bounded tasks. OpenBeam should sell **high-leverage autonomy with hard controls**, not "hands-off replacement".

### 2.3 OpenBeam already has strong stack fit for this domain

Current implemented connectors already match the engineering operating system:
- Slack
- GitHub
- Linear
- Notion
- Google Drive
- Gmail

## 3. Existing OpenBeam Assets vs Gaps

## 3.1 Strong assets (already in code)

- Connector app store exists for core engineering tools (`packages/integrations/src/index.ts`).
- Temporal sync pipeline with incremental/full sync exists (`packages/temporal/src/workflows/sync/connector-sync.ts`, `packages/temporal/src/activities/connectors/sync-registry.ts`).
- Mission system already supports incident-response template and multi-agent coordination (`apps/web/src/features/mission-control/components/create/template-picker.tsx`).
- Approval hooks, permission hooks, audit hooks, redaction, and provenance exist (`packages/ai/src/tools/hooks.ts`, `packages/ai/src/tools/definitions/mission/approvals.ts`).
- Citation and grounding path exists in RAG (`packages/api/src/routers/rag.ts`, `packages/services/src/ai/rag/orchestrator.ts`, `packages/services/src/ai/rag/grounding-verifier.ts`).

## 3.2 Critical gaps (must close)

- JIRA/Confluence/Zendesk sync factories are placeholders in sync registry (`createEmptySyncGenerator`).
- `researchRouter` is scaffolded but not implemented (`packages/api/src/routers/research.ts`).
- Access-control IDs in `search`/`rag` routers are minimal and not using full permission resolver context.
- No productized incident/release/decision vertical APIs with stable schemas and SLAs yet.

## 4. Product Package (What We Sell)

1. Incident Context Pack
- Timeline of incident signals across Slack/GitHub/Linear/Notion/Drive.
- Blast radius estimate + likely root-cause clusters.
- Action list with owners and due-time suggestions.

2. Release Readiness Brief
- Automated go/no-go summary from PR checks, review state, issue blockers, docs and incident context.
- Explicit blockers with evidence links.

3. Decision Memory
- "Why did we do this?" answers grounded in RFCs, PRs, issues, incident reports, and prior decision records.

4. Safe Action Layer
- Approval-gated updates/escalations/ticketing.
- Permission-correct action execution with audit trail.

## 5. Swarm Architecture (One Point at a Time)

Each customer request is executed by a deterministic swarm role graph:

1. `context-ingestor`
- Pulls candidate evidence from connectors.
- Enforces tenant and ACL filters before summarization.

2. `timeline-builder`
- Normalizes events into a canonical event timeline.
- Identifies causality candidates.

3. `risk-analyst`
- Scores release risk and incident risk from objective signals.

4. `decision-historian`
- Extracts and links decisions, alternatives, and consequences.

5. `citation-auditor`
- Rejects unsupported claims and enforces citation completeness.

6. `policy-guardian`
- Applies permission mode + approval policy.
- Gates high-risk actions.

7. `action-executor`
- Performs approved writes (ticket create/update, escalation posts, status updates).

8. `report-publisher`
- Produces final artifact (Incident Context Pack, Release Brief, Decision Memory answer).

OpenBeam already has patterns for this via `research-squad` and mission tooling; this work productizes it for EngOps workflows.

## 6. 90-Day Execution Plan

### Phase A (Days 1-30): Trust and Data Correctness

- Implement `researchRouter` end-to-end using Temporal-backed run lifecycle.
- Replace minimal ACL construction in `search` and `rag` routers with `resolvePermissions` output.
- Add citation refusal rule: no evidence -> no confident answer.
- Stabilize connector freshness/error observability for Slack/GitHub/Linear/Notion/Drive.

**Exit criteria:**
- Permission regression suite passes.
- Citation precision >= 0.9 on internal eval set.
- 95% sync freshness SLA for pilot tenants.

### Phase B (Days 31-60): Productize 3 Workflows

- Ship Incident Context Pack API + UI artifact template.
- Ship Release Readiness Brief API + UI page.
- Ship Decision Memory retrieval API + "why" response view.

**Exit criteria:**
- 2 design partners using weekly.
- Incident context generation under 2 minutes median.
- Release brief generated for >= 80% of release candidates.

### Phase C (Days 61-90): Conversion and Proof

- Launch approval-gated action execution for escalations/ticket updates.
- Publish one customer case study with hard metrics.
- Close first paid contracts and expansion plan.

**Exit criteria:**
- 2 paid design partners.
- Demonstrated MTTR reduction or release delay reduction.
- Monthly executive scorecard available per tenant.

## 7. GTM Motion (Focused)

## 7.1 ICP filter (hard gate)

Only target accounts that satisfy all:
- 200-2,000 employees.
- 50+ engineers.
- At least 4 tools from Slack/GitHub/Linear or Jira/Notion or Confluence/Drive.
- Active incident + release pain.
- Executive sponsor with authority to run 30-day pilot.

## 7.2 First outreach list (example)

1. Localyze (engineering org with matching tool stack footprint in public hiring signals).
2. CookUnity (engineering org with known workflow complexity and similar collaboration stack signals).

## 7.3 Commercial packaging (pilot)

- 30-day paid pilot with 2 workflows in scope (Incident Pack + Release Brief).
- Success criteria in contract:
  - Time-to-context reduction.
  - MTTR or release blocker lead-time improvement.
  - Citation trust adoption score.

## 8. Hard Truth: "Will We Win?"

You can win this vertical, but not "no matter what."

You lose if:
- You keep broad "AI for everyone" messaging.
- You ship ungrounded answers without permission correctness.
- You avoid proving value with hard operational metrics.

You can win if:
- You execute this vertical plan for two quarters without drift.
- You publish measurable pilot outcomes.
- You maintain strict trust posture (citations, ACL correctness, approvals).

## 9. Linked Deep-Dive Runbooks

- `docs/observability/runbooks/engops-incident-context-pack.md`
- `docs/observability/runbooks/engops-release-readiness-brief.md`
- `docs/observability/runbooks/engops-decision-memory.md`
- `docs/observability/runbooks/engops-safe-action-layer.md`

## 10. Source Notes (External)

- Anthropic: Measuring AI agent autonomy in practice (Feb 18, 2026)  
  https://www.anthropic.com/research/measuring-agent-autonomy
- METR: Measuring AI Ability to Complete Long Tasks (Mar 19, 2025)  
  https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/
- METR time horizons (updated Feb 6, 2026)  
  https://metr.org/time-horizons/
- GitHub: Merge Queue docs  
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue
- GitHub: CODEOWNERS docs  
  https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- GitHub: Rulesets (required deployments/status checks/merge queue)  
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
- Temporal workflow determinism + message passing + continue-as-new + heartbeat docs  
  https://docs.temporal.io/workflow-definition  
  https://docs.temporal.io/develop/typescript/message-passing  
  https://docs.temporal.io/develop/typescript/continue-as-new  
  https://docs.temporal.io/develop/typescript/failure-detection
- OpenFGA modeling docs  
  https://openfga.dev/docs/modeling/getting-started
- OPA docs  
  https://www.openpolicyagent.org/docs
- Slack rate-limit change for non-Marketplace apps  
  https://docs.slack.dev/changelog/2025/05/29/rate-limit-changes-for-non-marketplace-apps/
- Linear API rate limiting  
  https://linear.app/developers/rate-limiting
- Notion search and API limitations  
  https://developers.notion.com/reference/search-optimizations-and-limitations
