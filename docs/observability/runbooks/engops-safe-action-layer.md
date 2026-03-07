# EngOps Runbook 04: Safe Action Layer

Date: February 28, 2026
Scope: Pain Point 4 - AI trust fails without citations + permission correctness.

## 1. Product Definition

Safe Action Layer is the control system for all AI-generated write actions.

It guarantees:
1. Permission correctness (tenant + user + group + domain scopes).
2. Citation-backed reasoning before action recommendations.
3. Approval gates for high-risk or irreversible actions.
4. Full audit trail with reproducible context.

## 2. Current OpenBeam Baseline

Existing strengths:
- Tool hooks for access control, approval enforcement, rate limiting, audit logging, redaction, provenance (`packages/ai/src/tools/hooks.ts`).
- Mission approval request tool (`packages/ai/src/tools/definitions/mission/approvals.ts`).
- Mission API approval endpoints (`packages/api/src/routers/mission-control.ts`).
- Grounding verifier exists (`packages/services/src/ai/rag/grounding-verifier.ts`).

Main gap to close first:
- Replace minimal ACL list construction in `search` and `rag` routers with full resolver-based permission context.

## 3. Implementation Blueprint (Pin-to-Pin)

## 3.1 Unify permission resolution across read and write paths

Change:
- In `packages/api/src/routers/search.ts` and `packages/api/src/routers/rag.ts`, stop hand-building ACL IDs.
- Resolve ACL IDs via `resolvePermissions(...)` from `packages/services/src/permissions/resolver.ts`.

Expected effect:
- support `user:*`, `email:*`, `group:*`, `domain:*`, `team:*` scopes consistently.
- avoid silent under-filtering or over-exposure.

## 3.2 Introduce action policy contracts

Add shared types:
- `packages/types/src/services/safety/action-policy.ts`

Contracts:
1. `ActionRiskLevel`
2. `ActionIntent`
3. `ApprovalRequirement`
4. `ActionPolicyDecision`

Policy dimensions:
- reversibility
- blast radius
- external side effects
- data sensitivity
- actor trust level

## 3.3 Policy engine service

Create service module:
- `packages/services/src/safety/policy-engine.ts`

Responsibilities:
1. evaluate action against policy.
2. return allow/deny/require-approval.
3. include machine-readable reason codes.

Optional phase-2 integration:
- OPA or OpenFGA-backed policy checks for enterprise custom policy.

## 3.4 Citation gate before action

Add pre-action guard:
- if action recommendation is derived from AI synthesis, require citation score threshold.

Implementation points:
- enrich tool execution context with `groundingConfidence` and `citationCount`.
- deny action if below threshold for medium/high-risk writes.

Threshold proposal:
- low risk: no strict threshold
- medium risk: confidence >= 0.7 and >= 2 citations
- high/critical risk: confidence >= 0.8 and >= 3 independent citations

## 3.5 Approval workflow hardening

Current approval routing exists; productize with:

1. `approval SLAs`
- response timers and escalation path.

2. `approval context packet`
- intent, risks, cited evidence, rollback plan.

3. `two-person rule` for critical actions
- required in enterprise mode.

4. `decision logging`
- immutable log entry with approver identity and reason.

## 3.6 Safe execution adapters

Create action adapters in:
- `packages/services/src/safety/actions/`

Adapters:
1. `create_ticket.ts`
2. `update_ticket.ts`
3. `post_incident_update.ts`
4. `notify_exec_channel.ts`

Each adapter must:
- validate input via Zod.
- run policy check.
- check approval token if needed.
- execute action.
- emit audit record.

## 3.7 Audit and observability

Add metrics:
1. action attempts by risk level.
2. approvals requested vs approved vs denied.
3. unsafe-action blocks.
4. post-action rollback rate.
5. policy evaluation latency.

Log schema should include:
- teamId, actorId, actionType, risk, policyDecision, approvalId, citationsUsed.

## 4. Swarm Role Design

1. `policy-evaluator`
- computes action risk and gate decision.

2. `citation-auditor`
- validates citation sufficiency for proposed action.

3. `permission-resolver`
- ensures actor can see and act on target resources.

4. `approval-coordinator`
- requests and tracks approvals.

5. `action-executor`
- executes approved write operations.

6. `audit-guardian`
- records immutable trace and anomaly flags.

7. `rollback-advisor`
- proposes rollback/remediation if action fails.

## 5. Threat Model Checklist

Primary risks:
1. cross-tenant data leakage.
2. action on unauthorized resources.
3. hallucinated rationale driving write action.
4. approval bypass by malformed tool call.
5. missing audit trail for regulated customers.

Mitigations:
1. resolver-based ACL + tenant scoping for every read/write path.
2. Zod validation on all tool params.
3. citation/grounding thresholds before write actions.
4. signed approval tokens with expiry.
5. append-only audit records and alerting.

## 6. Tests and Validation

Required suites:
1. permission regression tests (group/domain/team scope).
2. approval bypass tests.
3. citation threshold enforcement tests.
4. action adapter integration tests.
5. audit integrity tests.

Red-team style cases:
- attempt cross-team target updates.
- attempt action using unsupported claim.
- attempt replay of stale approval token.

## 7. KPI and Trust Targets

1. Unauthorized action rate: 0.
2. Citationless high-risk action execution: 0.
3. Approval policy violation count: 0.
4. Median approval turnaround (tracked, target by customer policy).
5. Audit completeness: 100% of write actions.

## 8. Rollout Plan

1. Week 1-2: ACL unification + policy contracts.
2. Week 3-4: citation gate + approval hardening.
3. Week 5-6: safe adapters + audit dashboards.
4. Week 7-8: pilot security review + SOC2 evidence mapping.

## 9. External Research and Constraints

- OpenFGA patterns for relationship-based authorization.  
  https://openfga.dev/docs/modeling/getting-started
- OPA policy framework for policy-as-code and auditability.  
  https://www.openpolicyagent.org/docs
- Google Zanzibar paper as reference architecture for global authorization consistency.  
  https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/
- Temporal determinism and failure/heartbeat guidance for reliable approval workflows.  
  https://docs.temporal.io/workflow-definition  
  https://docs.temporal.io/develop/typescript/failure-detection

## 10. Done Criteria

Safe Action Layer is "launchable" when:

1. All risky actions flow through policy + approval checks.
2. High-risk actions require citation-backed rationale.
3. Permission correctness tests pass across all supported connector scopes.
4. Audit logs can reconstruct every action decision end-to-end.
