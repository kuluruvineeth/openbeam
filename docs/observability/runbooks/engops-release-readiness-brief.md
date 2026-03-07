# EngOps Runbook 02: Release Readiness Brief

Date: February 28, 2026
Scope: Pain Point 2 - Release risk is hidden until late.

## 1. Product Definition

Release Readiness Brief is an evidence-backed go/no-go report generated before deployment windows.

It outputs:
1. `decision`: `GO`, `GO_WITH_RISK`, or `NO_GO`.
2. `blocking_issues`: explicit blockers with citations.
3. `risk_breakdown`: score by category.
4. `required_actions`: what must happen before release.

No uncited blocker or uncited "safe" claim is allowed.

## 2. Signals to Aggregate

## 2.1 Engineering execution signals

- GitHub PR status checks, failed checks, stale approvals, merge conflicts.
- Open critical issues linked to release scope.
- Merge queue state and branch protection constraints.

## 2.2 Product/operations signals

- Linear/Jira blockers not in done state.
- Slack incident/regression chatter in relevant channels.
- Notion/Drive release checklist completeness.

## 2.3 Production risk signals

- Recent incidents touching same services.
- Error-budget burn or elevated failure trends.
- Unresolved rollback tasks.

## 3. Implementation Blueprint (Pin-to-Pin)

## 3.1 Shared contracts

Add in `@openbeam/types`:

1. `packages/types/src/services/release/readiness.ts`
- `ReleaseCandidate`
- `ReleaseRiskSignal`
- `ReleaseRiskCategory`
- `ReleaseReadinessBrief`
- `ReleaseDecision`

2. `packages/types/src/api/release.ts`
- `createReleaseBriefInputSchema`
- `releaseBriefResponseSchema`

## 3.2 Persistence

Add Prisma schema file:
- `packages/db/prisma/schema/release-readiness.prisma`

Tables:
1. `ReleaseCandidateRecord`
2. `ReleaseReadinessBriefRecord`
3. `ReleaseRiskSignalRecord`

Indexes:
- `(teamId, releaseKey, createdAt DESC)`
- `(teamId, decision, createdAt DESC)`

## 3.3 Service module

Create service package under:
- `packages/services/src/release-readiness/`

Core modules:
1. `signal-collectors/github.ts`
2. `signal-collectors/linear.ts`
3. `signal-collectors/slack.ts`
4. `signal-collectors/docs.ts`
5. `risk-scorer.ts`
6. `decision-engine.ts`
7. `brief-generator.ts`

## 3.4 Risk scoring model

Use an explicit weighted model first (model-free baseline):

`risk = 0.30*code_health + 0.25*scope_stability + 0.20*incident_exposure + 0.15*ops_readiness + 0.10*owner_confidence`

Category definitions:
- `code_health`: failed checks, unreviewed/high-risk PRs.
- `scope_stability`: late-scope additions, unresolved blockers.
- `incident_exposure`: related incident churn in last N days.
- `ops_readiness`: runbook/checklist/deployment approvals.
- `owner_confidence`: explicit owner confirmations.

Decision thresholds:
- `risk < 0.30`: `GO`
- `0.30 <= risk < 0.55`: `GO_WITH_RISK`
- `risk >= 0.55`: `NO_GO`

Store each intermediate value for auditability.

## 3.5 API router

Create `packages/api/src/routers/release-readiness.ts` with:

1. `createBrief`
2. `getBrief`
3. `listBriefs`
4. `acknowledgeRisk`
5. `overrideDecision` (approval-gated)

Rules:
- strict Zod input validation.
- tenant-scoped queries.
- override requires explicit approval + reason.

## 3.6 Temporal orchestration

Create workflow in `packages/temporal/src/workflows/release/release-readiness.ts`.

Steps:
1. load release candidate scope.
2. collect connector signals in parallel.
3. compute risk per category.
4. generate brief text with citation links.
5. run grounding verifier.
6. persist and notify owners.

Signals:
- `requestRecompute` when new blockers appear.
- `cancel` when release is postponed.

## 3.7 UI integration

Add feature in `apps/web/src/features/release-readiness/`:

Views:
1. release list with decision badges.
2. detailed risk waterfall panel.
3. blocker table with source citations.
4. action checklist with owner assignment.

Integrations:
- Mission artifact creation for every generated brief.
- Slack share action with summary + link to full report.

## 4. Swarm Role Design

1. `release-scope-parser`
- infers included PRs/issues/docs.

2. `ci-health-analyzer`
- parses checks/build health.

3. `incident-correlator`
- links recent incidents to release scope.

4. `operations-checker`
- validates checklists and runbook readiness.

5. `risk-judge`
- computes category and overall risk.

6. `citation-auditor`
- verifies every blocker has evidence.

7. `release-brief-writer`
- emits structured brief and recommended actions.

8. `approvals-gatekeeper`
- enforces overrides and risky-action approvals.

## 5. Connector-Specific Notes

GitHub:
- Respect branch protections, required checks, and merge queue states.
- Use PR metadata already indexed by existing transformers.

Linear/Jira:
- Capture issue states and unresolved high-priority blockers.
- For Jira support, implement real sync factory before claiming full coverage.

Slack:
- Include release and incident channel references, but cache aggressively due rate limits.

Notion/Drive:
- Parse release checklist docs and decision records with citation snippets.

## 6. Tests and Validation

1. Deterministic risk-score tests (fixed fixtures, fixed outputs).
2. API authorization tests for team isolation.
3. Workflow integration test for recompute signal handling.
4. Citation completeness tests.
5. Override approval policy tests.

Definition of done:
- Report reproducibility from same input set.
- Zero uncited blockers.
- Documented false-positive/false-negative rate for pilot tenants.

## 7. KPI and ROI Model

Primary KPI:
- Reduction in late release surprises (blockers discovered <24h pre-release).

Secondary KPI:
- Change failure rate trend.
- Rollback frequency.
- Time-to-go/no-go decision.

Example ROI baseline:
- If one major delayed release/month is prevented, value usually exceeds pilot cost quickly for mid-market SaaS teams.

## 8. Rollout Plan

1. Week 1-2: contracts + scorer + router skeleton.
2. Week 3-4: Temporal orchestration + persistence + first UI.
3. Week 5-6: calibration with 2 pilot teams.
4. Week 7-8: override governance + executive scorecard.

## 9. External Research and Constraints

- GitHub merge queue and branch rules are reliable primary sources for release control signals.  
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue
- GitHub rulesets and CODEOWNERS define enforceable review gates.  
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets  
  https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- DORA/Google Four Keys remains the best-known operational framing for deployment health outcomes.  
  https://dora.dev/  
  https://cloud.google.com/blog/products/devops-sre/how-to-measure-software-delivery-performance-using-dora-metrics
- Apache DevLake metrics definitions help normalize change and incident metrics.  
  https://devlake.apache.org/docs/Metrics/metrics/

## 10. Done Criteria

Release Readiness Brief is "launchable" when:

1. Pilot teams generate briefs for >= 80% of release candidates.
2. At least 70% of flagged blockers are validated by human owners.
3. Decision latency is reduced versus baseline release process.
4. No cross-tenant or uncited claim incidents in production.
