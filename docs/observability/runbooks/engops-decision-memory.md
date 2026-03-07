# EngOps Runbook 03: Decision Memory

Date: February 28, 2026
Scope: Pain Point 3 - Teams lose decision history ("why did we do this?").

## 1. Product Definition

Decision Memory turns fragmented artifacts (RFCs, PRs, issues, Slack threads, docs) into a retrievable, citation-backed decision graph.

User outcome:
- Ask: "Why did we choose approach X over Y?"
- Receive: concise answer with timestamped citations, decision owner, alternatives considered, and downstream impact.

## 2. Current OpenBeam Baseline

What already exists:
- Cross-tool retrieval and grounding in RAG.
- Mission memory primitives (`readMemory`, `writeMemory`) and artifact persistence.
- Search index (`GenericDocument`) with rich metadata and relationship fields.

What is missing:
- Decision-specific extraction and canonical schema.
- "why" query route that enforces citation quality threshold.
- Lifecycle for superseded decisions and contradiction handling.

## 3. Implementation Blueprint (Pin-to-Pin)

## 3.1 Shared types

Add:
- `packages/types/src/services/decisions/decision-record.ts`

Core contracts:
1. `DecisionRecord`
2. `DecisionAlternative`
3. `DecisionConsequence`
4. `DecisionCitation`
5. `DecisionStatus` (`active`, `superseded`, `reverted`, `experimental`)

Schema requirements:
- required fields: `question`, `decision`, `owner`, `decisionDate`, `citations[]`.
- optional fields: `alternatives[]`, `tradeoffs[]`, `consequences[]`, `reviewDate`.

## 3.2 Persistence model

Add Prisma file:
- `packages/db/prisma/schema/decision-memory.prisma`

Tables:
1. `DecisionRecord`
2. `DecisionCitation`
3. `DecisionLink` (decision-to-decision relation)
4. `DecisionFeedback` (helpful/incorrect/conflicting)

Indexes:
- `(teamId, normalizedQuestionHash)`
- `(teamId, status, updatedAt DESC)`

## 3.3 Extraction pipeline

Build service modules in:
- `packages/services/src/decision-memory/`

Modules:
1. `extract-decision-candidates.ts`
- identifies decision-like text from docs/threads/PRs.

2. `normalize-decision.ts`
- maps candidate to canonical schema.

3. `link-related-decisions.ts`
- links supersessions, dependencies, conflicts.

4. `verify-decision-grounding.ts`
- validates each claim against cited chunks.

5. `answer-why-query.ts`
- composes user-facing response with confidence and citations.

## 3.4 API router

Create `packages/api/src/routers/decision-memory.ts`:

1. `upsertDecisionRecord`
2. `listDecisionRecords`
3. `getDecisionRecord`
4. `answerWhy`
5. `markSuperseded`
6. `submitDecisionFeedback`

Policy:
- all reads/writes tenant-scoped.
- only privileged roles can mark superseded/reverted.
- `answerWhy` refuses to answer confidently if citation quality below threshold.

## 3.5 Temporal workflow

Create workflow:
- `packages/temporal/src/workflows/decision/decision-memory-refresh.ts`

Runs nightly or on-demand:
1. fetch recent candidate documents.
2. extract decision candidates.
3. normalize + dedupe.
4. grounding verification.
5. persist decision graph.
6. emit summary metrics.

Use incremental cursor per connector/time window.

## 3.6 RAG integration

Extend existing RAG flow:

1. Add optional retrieval mode `decision-first`.
2. Query decision store before broad document retrieval.
3. Merge decision records with source chunk citations.
4. Expose answer provenance in response metadata.

Files likely touched:
- `packages/services/src/ai/rag/orchestrator.ts`
- `packages/services/src/ai/rag/types.ts`
- `packages/api/src/routers/rag.ts`

## 3.7 UX surface

Create feature:
- `apps/web/src/features/decision-memory/`

Screens:
1. Decision timeline.
2. "Why" query panel.
3. Decision diff (when superseded).
4. Citation explorer.

Interactions:
- copy decision summary.
- open cited Slack/PR/doc sources.
- flag wrong/missing context.

## 4. Swarm Role Design

1. `decision-miner`
- extracts decision candidates from heterogeneous text.

2. `alternative-mapper`
- captures rejected alternatives and tradeoffs.

3. `contradiction-detector`
- flags conflicting or superseded records.

4. `citation-auditor`
- enforces support threshold for each decision claim.

5. `decision-curator`
- finalizes normalized decision record.

6. `why-answer-agent`
- answers user query using decision-first retrieval.

7. `governance-agent`
- validates who can override/supersede decisions.

## 5. Quality and Confidence Rules

Mandatory:
1. No decision record without at least one primary-source citation.
2. Record confidence score from grounding verifier.
3. If confidence below threshold, return `insufficient_evidence` and request human review.
4. Preserve superseded chain; do not delete history.

Suggested thresholds:
- high confidence >= 0.8
- medium confidence 0.6-0.79
- low confidence < 0.6 (cannot auto-answer as fact)

## 6. Tests and Validation

1. Extraction tests with RFC/PR/Slack fixtures.
2. Dedupe tests (same decision mentioned in multiple sources).
3. Contradiction tests (new decision supersedes old).
4. ACL tests across group/domain/team scopes.
5. Grounding tests for low-support claims.

Acceptance criteria:
- `answerWhy` returns cited answer for at least 85% of eval queries.
- false citation rate < 5% in pilot human audits.
- superseded chains are preserved and navigable.

## 7. KPI and ROI

1. Time to answer architecture/product "why" questions.
2. Duplicate debate reduction (repeat discussion volume).
3. Onboarding acceleration for new senior engineers.

Simple ROI framing:
- If a 100-engineer org saves 30 minutes/week/engineer from faster context retrieval, annual value is material even before incident/release gains.

## 8. Rollout Plan

1. Week 1-2: schema + extraction baseline + router.
2. Week 3-4: confidence/grounding + contradiction logic.
3. Week 5-6: decision-first retrieval mode + UI.
4. Week 7-8: pilot calibration and feedback loops.

## 9. External Research and Constraints

- ADR conventions are a practical baseline for durable decision records.  
  https://github.com/joelparkerhenderson/architecture-decision-record
- Notion API search limitations impact exhaustive historical retrieval; design around incremental + targeted queries.  
  https://developers.notion.com/reference/search-optimizations-and-limitations
- OpenFGA/relationship-based authorization patterns are relevant for decision visibility controls in multi-team orgs.  
  https://openfga.dev/docs/modeling/getting-started

## 10. Done Criteria

Decision Memory is "launchable" when:

1. `answerWhy` is citation-backed and permission-correct.
2. Superseded decisions remain traceable.
3. Pilot teams use it in real planning/review cycles weekly.
4. Feedback loop improves precision month-over-month.
