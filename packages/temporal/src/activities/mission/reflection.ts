import { complete } from "@openplane/ai";
import type { Database } from "@openplane/db";
import type {
  PeerReview,
  ReviewConsensus,
  StandupConflict,
  StandupReport,
} from "@openplane/types/temporal/mission-reflection";
import {
  type CriticReview,
  CriticReviewSchema,
  type MissionHealthSnapshot,
  MissionHealthSnapshotSchema,
  type ReplanResult,
  ReplanResultSchema,
  type StepEvaluation,
  StepEvaluationSchema,
} from "@openplane/types/temporal/mission-reflection";
import { Context } from "@temporalio/activity";
import type {
  CheckMissionHealthInput,
  CriticReviewInput,
  EscalateInput,
  EvaluateProgressInput,
  GenerateReplanInput,
  GetPeerReviewsInput,
  GetPeerReviewsOutput,
  NotifyDependencyFailureInput,
  NotifyDependencyFailureOutput,
  ReflectionActivities,
  SubmitPeerReviewInput,
  SynthesizeStandupInput,
  SynthesizeStandupOutput,
} from "./reflection-types";

const HEALTH_STUCK_THRESHOLD_MS = 10 * 60 * 1000;
const HEALTH_MAX_RUNNING_RUNS = 100;
const HEALTH_MAX_REFLECTION_STEPS = 20;
const JSON_OBJECT_REGEX = /\{[\s\S]*\}/;
const DEFAULT_LLM_TIMEOUT_MS = 90_000;

type GenerateTextFn = (
  prompt: string,
  systemPrompt: string,
  signal?: AbortSignal
) => Promise<string>;

export async function generateTextWithTimeout(
  prompt: string,
  systemPrompt: string,
  generateText: GenerateTextFn,
  timeoutMs: number = DEFAULT_LLM_TIMEOUT_MS
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    Context.current().heartbeat({ phase: "llm_call_started" });
    const result = await generateText(prompt, systemPrompt, controller.signal);
    Context.current().heartbeat({ phase: "llm_call_completed" });
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface ReflectionActivityDependencies {
  db: Database;
  generateText?: GenerateTextFn;
}

export function createDefaultReflectionTextGenerator(): GenerateTextFn {
  return async (prompt, systemPrompt, signal) => {
    const result = await complete(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      {
        temperature: 0.2,
        abortSignal: signal,
      }
    );

    return result.content;
  };
}

export function createReflectionActivities(
  deps: ReflectionActivityDependencies
): ReflectionActivities {
  const { db } = deps;
  const generateText =
    deps.generateText ?? createDefaultReflectionTextGenerator();

  return {
    async evaluateProgress(
      input: EvaluateProgressInput
    ): Promise<StepEvaluation> {
      const artifactSummaries = input.recentArtifacts
        .map((artifact, index) => {
          const preview =
            typeof artifact.content === "string"
              ? artifact.content.slice(0, 300)
              : JSON.stringify(artifact.content).slice(0, 300);
          return `[${index + 1}] ${preview}`;
        })
        .join("\n");

      const reflectionHistory = input.reflectionBuffer
        .map(
          (entry) =>
            `Step ${entry.step}: score=${entry.evaluation.progressScore.toFixed(2)}, action=${entry.evaluation.suggestedAction}`
        )
        .join("\n");

      const evaluationPrompt = `<task>
Evaluate the agent's progress on the following task.
</task>

<task_context>
Title: ${input.taskContext.title}
Description: ${input.taskContext.description ?? "None"}
Current step: ${input.currentStep} of ${input.maxSteps}
</task_context>

<recent_artifacts>
${artifactSummaries || "No artifacts produced yet"}
</recent_artifacts>

<reflection_history>
${reflectionHistory || "No prior reflections"}
</reflection_history>

<output_format>
Respond with a JSON object:
{
  "progressScore": 0.0-1.0,
  "confidenceScore": 0.0-1.0,
  "stuckIndicators": {
    "repeatingActions": boolean,
    "noNewArtifacts": boolean,
    "errorLoop": boolean,
    "progressPlateau": boolean
  },
  "reasoning": "Brief analysis of progress",
  "suggestedAction": "continue" | "replan" | "escalate"
}
</output_format>`;

      const systemPrompt =
        "You are a self-evaluation module for an AI agent working on enterprise tasks. Be honest and calibrated in your assessment. A progressScore below 0.3 indicates the agent is stuck. Suggest replan if the current approach is failing, and escalate only when the task appears beyond the agent's capabilities.";

      const response = await generateTextWithTimeout(
        evaluationPrompt,
        systemPrompt,
        generateText
      );

      return parseEvaluationResponse(response, input);
    },

    async generateReplan(input: GenerateReplanInput): Promise<ReplanResult> {
      const reflectionSummary = input.reflectionBuffer
        .map(
          (entry) =>
            `Step ${entry.step}: ${entry.outcome.slice(0, 150)} (score: ${entry.evaluation.progressScore.toFixed(2)})`
        )
        .join("\n");

      const failurePatternContext =
        input.failurePatterns.length > 0
          ? input.failurePatterns.map((pattern) => `- ${pattern}`).join("\n")
          : "No prior failure patterns recorded";

      const replanPrompt = `<task>
Generate a new approach for this task. The current approach is not working.
</task>

<task_context>
Title: ${input.taskContext.title}
Description: ${input.taskContext.description ?? "None"}
Prior attempts: ${input.taskContext.priorAttempts}
</task_context>

<current_approach>
${input.currentApproach.slice(0, 500)}
</current_approach>

<what_went_wrong>
${reflectionSummary}
</what_went_wrong>

<known_failure_patterns>
${failurePatternContext}
</known_failure_patterns>

<constraints>
- The new approach must be different from the current approach
- Avoid repeating known failure patterns
- Be specific about what to change
</constraints>

<output_format>
Respond with a JSON object:
{
  "newApproach": "Description of the new strategy",
  "strategyShift": "One-line summary of what changed",
  "adjustedPrompt": "The full revised soul prompt for the agent",
  "reasoning": "Why this new approach should work"
}
</output_format>`;

      const systemPrompt =
        "You are a replanning module. When an agent is stuck, generate alternative approaches with structural changes, not minor tweaks. If the prior path was single-pass, suggest decomposition. If one tool family failed, propose a different tool combination.";

      const response = await generateTextWithTimeout(
        replanPrompt,
        systemPrompt,
        generateText
      );

      return parseReplanResponse(response, input.currentApproach);
    },

    async criticReview(input: CriticReviewInput) {
      const artifactContent = input.artifacts
        .map((artifact, index) => {
          const preview =
            typeof artifact.content === "string"
              ? artifact.content.slice(0, 500)
              : JSON.stringify(artifact.content).slice(0, 500);
          return `--- Artifact ${index + 1} (${artifact.type}) ---\n${preview}`;
        })
        .join("\n\n");

      const criticPrompt = `<task>
Review the agent's output for quality and completeness.
</task>

<task_context>
Title: ${input.taskContext.title}
Description: ${input.taskContext.description ?? "None"}
</task_context>

<agent_output>
${artifactContent || "No artifacts produced"}
</agent_output>

<output_format>
Respond with a JSON object:
{
  "passed": boolean,
  "qualityScore": 0.0-1.0,
  "issues": [{"severity": "blocking"|"major"|"minor", "description": "..."}],
  "recommendation": "accept" | "revise" | "reject"
}
</output_format>`;

      const systemPrompt =
        "You are a quality critic for AI agent outputs. Evaluate whether the output satisfies the task requirements. Be rigorous but fair. Reject only for blocking issues. Revise for major issues with salvageable value.";

      const response = await generateTextWithTimeout(
        criticPrompt,
        systemPrompt,
        generateText
      );

      return parseCriticResponse(response);
    },

    async escalate(input: EscalateInput): Promise<void> {
      await db.missionTask.update({
        where: { id: input.taskId },
        data: {
          status: "BLOCKED",
        },
      });

      await db.missionComment.create({
        data: {
          taskId: input.taskId,
          fromAgentId: input.agentId,
          content: `ESCALATION: ${input.reason}\n\nSuggested next steps:\n${input.suggestedNextSteps.map((step) => `- ${step}`).join("\n")}`,
          mentions: [],
        },
      });
    },

    async checkMissionHealth(
      input: CheckMissionHealthInput
    ): Promise<MissionHealthSnapshot> {
      const now = Date.now();

      const runningRuns = await db.missionRun.findMany({
        where: {
          missionId: input.missionId,
          status: "RUNNING",
        },
        select: {
          agentId: true,
          taskId: true,
          startedAt: true,
        },
        orderBy: { startedAt: "asc" },
        take: HEALTH_MAX_RUNNING_RUNS,
      });

      const agentEntries = await Promise.all(
        runningRuns.map(async (run) => {
          const reflectionMemory = await db.missionMemory.findUnique({
            where: {
              missionId_agentId_key_scope: {
                missionId: input.missionId,
                agentId: run.agentId,
                key: "reflection_buffer",
                scope: "agent",
              },
            },
          });

          const allReflections = normalizeReflectionBuffer(
            reflectionMemory?.value
          );
          const reflections = allReflections.slice(
            -HEALTH_MAX_REFLECTION_STEPS
          );
          const lastReflection = reflections.at(-1);
          const lastProgressScore =
            lastReflection?.evaluation.progressScore ?? 0.5;
          const stepsCompleted = lastReflection?.step ?? 0;

          const currentStepMemory = await db.missionMemory.findUnique({
            where: {
              missionId_agentId_key_scope: {
                missionId: input.missionId,
                agentId: run.agentId,
                key: "current_step",
                scope: "agent",
              },
            },
          });
          const currentStepValue =
            typeof currentStepMemory?.value === "object" &&
            currentStepMemory.value !== null &&
            !Array.isArray(currentStepMemory.value)
              ? (currentStepMemory.value as Record<string, unknown>)
              : {};
          const replanCount = toNumber(currentStepValue.replanCount) ?? 0;

          const isStuckByScore = lastProgressScore < 0.3;
          const isStuckByDuration = run.startedAt
            ? now - run.startedAt.getTime() > HEALTH_STUCK_THRESHOLD_MS
            : false;
          const escalationRequested =
            lastReflection?.evaluation.suggestedAction === "escalate";

          let status:
            | "progressing"
            | "slow"
            | "stuck"
            | "escalated"
            | "completed" = "progressing";
          if (escalationRequested) {
            status = "escalated";
          } else if (isStuckByScore && isStuckByDuration) {
            status = "stuck";
          } else if (isStuckByScore || isStuckByDuration) {
            status = "slow";
          }

          return {
            agentId: run.agentId,
            taskId: run.taskId ?? "",
            stepsCompleted,
            lastProgressScore,
            stuckSince:
              status === "stuck" ? (run.startedAt?.getTime() ?? now) : null,
            replanCount,
            status,
          };
        })
      );

      const blockedTasks = await db.missionTask.findMany({
        where: {
          missionId: input.missionId,
          status: "BLOCKED",
        },
        select: {
          id: true,
          dependsOn: true,
        },
      });
      const blockedTaskIds = new Set(blockedTasks.map((task) => task.id));

      const candidateTasks = await db.missionTask.findMany({
        where: {
          missionId: input.missionId,
          status: {
            in: ["INBOX", "ASSIGNED", "IN_PROGRESS"],
          },
        },
        select: {
          id: true,
          dependsOn: true,
        },
      });

      const failedDependencies = [...blockedTaskIds]
        .map((failedTaskId) => ({
          failedTaskId,
          blockedTaskIds: candidateTasks
            .filter((task) => task.dependsOn.includes(failedTaskId))
            .map((task) => task.id),
        }))
        .filter((entry) => entry.blockedTaskIds.length > 0);

      const snapshot = {
        missionId: input.missionId,
        timestamp: now,
        agents: agentEntries,
        stalledTasks: agentEntries
          .filter((entry) => entry.status === "stuck")
          .map((entry) => entry.taskId),
        failedDependencies,
      };

      return MissionHealthSnapshotSchema.parse(snapshot);
    },

    async notifyDependencyFailure(
      input: NotifyDependencyFailureInput
    ): Promise<NotifyDependencyFailureOutput> {
      const dependentTasks = await db.missionTask.findMany({
        where: {
          missionId: input.missionId,
          dependsOn: { has: input.failedTaskId },
          status: {
            in: ["INBOX", "ASSIGNED", "IN_PROGRESS"],
          },
        },
        select: {
          id: true,
          assigneeId: true,
          dependsOn: true,
        },
      });

      const notifiedTaskIds: string[] = [];
      const adaptedTaskIds: string[] = [];

      for (const task of dependentTasks) {
        await db.missionComment.create({
          data: {
            taskId: task.id,
            fromAgentId: null,
            content: `DEPENDENCY FAILURE: Upstream task "${input.failedTaskTitle}" (${input.failedTaskId}) failed. Reason: ${input.reason}. This task may need reassessment or an adapted approach.`,
            mentions: task.assigneeId ? [task.assigneeId] : [],
          },
        });
        notifiedTaskIds.push(task.id);

        const remainingDependencies = task.dependsOn.filter(
          (dependency) => dependency !== input.failedTaskId
        );
        if (remainingDependencies.length === 0) {
          await db.missionTask.update({
            where: { id: task.id },
            data: { dependsOn: [] },
          });
          adaptedTaskIds.push(task.id);
          continue;
        }

        const unresolvedDependencies = await db.missionTask.findMany({
          where: {
            id: { in: remainingDependencies },
            status: { not: "DONE" },
          },
          select: { id: true },
        });

        if (unresolvedDependencies.length === 0) {
          await db.missionTask.update({
            where: { id: task.id },
            data: { dependsOn: remainingDependencies },
          });
          adaptedTaskIds.push(task.id);
        }
      }

      return {
        notifiedTaskIds,
        adaptedTaskIds,
      };
    },

    async submitPeerReview(input: SubmitPeerReviewInput): Promise<void> {
      const memoryKey = `peer_reviews:${input.review.taskId}`;
      const existing = await db.missionMemory.findUnique({
        where: {
          missionId_agentId_key_scope: {
            missionId: input.missionId,
            agentId: "system",
            key: memoryKey,
            scope: "mission",
          },
        },
      });

      const reviews: PeerReview[] = Array.isArray(existing?.value)
        ? (existing.value as PeerReview[])
        : [];

      const alreadyReviewed = reviews.some(
        (r) => r.reviewerAgentId === input.review.reviewerAgentId
      );
      if (!alreadyReviewed) {
        reviews.push(input.review);
      }

      await db.missionMemory.upsert({
        where: {
          missionId_agentId_key_scope: {
            missionId: input.missionId,
            agentId: "system",
            key: memoryKey,
            scope: "mission",
          },
        },
        create: {
          missionId: input.missionId,
          agentId: "system",
          key: memoryKey,
          scope: "mission",
          value: reviews,
        },
        update: {
          value: reviews,
        },
      });
    },

    async getPeerReviews(
      input: GetPeerReviewsInput
    ): Promise<GetPeerReviewsOutput> {
      const memoryKey = `peer_reviews:${input.taskId}`;
      const existing = await db.missionMemory.findUnique({
        where: {
          missionId_agentId_key_scope: {
            missionId: input.missionId,
            agentId: "system",
            key: memoryKey,
            scope: "mission",
          },
        },
      });

      const reviews: PeerReview[] = Array.isArray(existing?.value)
        ? (existing.value as PeerReview[])
        : [];

      const consensus =
        reviews.length > 0 ? tallyReviewConsensus(reviews, input.taskId) : null;

      return { reviews, consensus };
    },

    synthesizeStandup(
      input: SynthesizeStandupInput
    ): Promise<SynthesizeStandupOutput> {
      const blockedAgents = input.reports.filter(
        (r) => r.status === "blocked" || r.requestsHelp
      );

      const overallHealth = resolveStandupHealth(
        blockedAgents.length,
        input.reports.length,
        input.missedAgentIds.length
      );

      const conflicts = detectStandupConflicts(input.reports);

      const actionItems = [
        ...blockedAgents.map(
          (r) => `Unblock ${r.agentName}: ${r.blockers.join(", ")}`
        ),
        ...input.missedAgentIds.map(
          (id) => `Check on unresponsive agent ${id}`
        ),
        ...conflicts.map((c) => c.suggestedResolution),
      ];

      return Promise.resolve({
        summary: {
          roundId: input.roundId,
          missionId: input.missionId,
          timestamp: Date.now(),
          reports: input.reports,
          conflicts,
          overallHealth,
          actionItems,
          missedAgents: input.missedAgentIds,
        },
      });
    },
  };
}

function resolveStandupHealth(
  blockedCount: number,
  reportCount: number,
  missedCount: number
): "healthy" | "degraded" | "critical" {
  if (blockedCount === 0 && missedCount === 0) {
    return "healthy";
  }
  if (reportCount > 0 && blockedCount > reportCount / 2) {
    return "critical";
  }
  return "degraded";
}

function detectStandupConflicts(reports: StandupReport[]): StandupConflict[] {
  const conflicts: StandupConflict[] = [];

  for (let i = 0; i < reports.length; i++) {
    for (let j = i + 1; j < reports.length; j++) {
      const a = reports[i];
      const b = reports[j];
      if (!(a && b)) {
        continue;
      }
      if (a.taskId === b.taskId) {
        conflicts.push({
          type: "duplicate_work",
          agentIds: [a.agentId, b.agentId],
          description: `Both agents working on "${a.taskTitle}"`,
          suggestedResolution: "Reassign one agent to different task",
        });
      }
    }
  }

  return conflicts;
}

export function tallyReviewConsensus(
  reviews: PeerReview[],
  taskId: string
): ReviewConsensus {
  if (reviews.length === 0) {
    return {
      taskId,
      reviews: [],
      finalVerdict: "approve",
      averageQualityScore: 0,
      unanimousApproval: true,
      hasVeto: false,
      reasoning: "No reviews submitted",
    };
  }

  const rejectVoters = reviews.filter((r) => r.verdict === "reject");
  const approveCount = reviews.filter((r) => r.verdict === "approve").length;
  const reviseCount = reviews.filter((r) => r.verdict === "revise").length;
  const avgScore =
    reviews.reduce((sum, r) => sum + r.qualityScore, 0) / reviews.length;

  if (rejectVoters.length > 0) {
    return {
      taskId,
      reviews,
      finalVerdict: "reject",
      averageQualityScore: avgScore,
      unanimousApproval: false,
      hasVeto: true,
      reasoning: `Rejected by ${rejectVoters.map((r) => r.reviewerAgentName).join(", ")}`,
    };
  }

  const finalVerdict = approveCount >= reviseCount ? "approve" : "revise";
  const unanimousApproval = approveCount === reviews.length;

  return {
    taskId,
    reviews,
    finalVerdict,
    averageQualityScore: avgScore,
    unanimousApproval,
    hasVeto: false,
    reasoning: unanimousApproval
      ? "Unanimously approved"
      : `${approveCount} approve, ${reviseCount} revise — ${finalVerdict} by majority`,
  };
}

function parseEvaluationResponse(
  response: string,
  input: EvaluateProgressInput
): StepEvaluation {
  const extracted = extractFirstJsonObject(response);
  if (extracted) {
    const parsed = StepEvaluationSchema.safeParse(extracted);
    if (parsed.success) {
      return parsed.data;
    }
  }

  const progressRatio = input.currentStep / input.maxSteps;
  return {
    progressScore: progressRatio > 0.8 ? 0.2 : 0.5,
    confidenceScore: 0.3,
    stuckIndicators: {
      repeatingActions: false,
      noNewArtifacts: input.recentArtifacts.length === 0,
      errorLoop: false,
      progressPlateau: progressRatio > 0.5,
    },
    reasoning:
      "Evaluation response could not be parsed; using deterministic fallback",
    suggestedAction: progressRatio > 0.8 ? "replan" : "continue",
  };
}

function parseReplanResponse(
  response: string,
  currentApproach: string
): ReplanResult {
  const extracted = extractFirstJsonObject(response);
  if (extracted) {
    const parsed = ReplanResultSchema.safeParse(extracted);
    if (parsed.success) {
      return parsed.data;
    }
  }

  return {
    newApproach:
      "Decompose the task into smaller sub-tasks and solve each independently",
    strategyShift: "Fallback decomposition strategy",
    adjustedPrompt: `${currentApproach}\n\nIMPORTANT: Your previous approach did not make sufficient progress. Use a fundamentally different strategy with explicit decomposition and concrete checkpoints.`,
    reasoning: "Replan response could not be parsed; using fallback strategy",
  };
}

function parseCriticResponse(response: string): CriticReview {
  const extracted = extractFirstJsonObject(response);
  if (extracted) {
    const parsed = CriticReviewSchema.safeParse(extracted);
    if (parsed.success) {
      return parsed.data;
    }
  }

  return {
    passed: true,
    qualityScore: 0.6,
    issues: [],
    recommendation: "accept",
  };
}

function extractFirstJsonObject(text: string): unknown | null {
  const match = text.match(JSON_OBJECT_REGEX);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]) as unknown;
  } catch {
    return null;
  }
}

function normalizeReflectionBuffer(value: unknown): Array<{
  step: number;
  evaluation: {
    progressScore: number;
    suggestedAction: "continue" | "replan" | "escalate";
  };
}> {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: Array<{
    step: number;
    evaluation: {
      progressScore: number;
      suggestedAction: "continue" | "replan" | "escalate";
    };
  }> = [];

  for (const candidate of value) {
    if (
      !candidate ||
      typeof candidate !== "object" ||
      Array.isArray(candidate)
    ) {
      continue;
    }

    const step = toNumber((candidate as Record<string, unknown>).step);
    const evaluation = (candidate as Record<string, unknown>).evaluation;
    if (
      step === undefined ||
      !evaluation ||
      typeof evaluation !== "object" ||
      Array.isArray(evaluation)
    ) {
      continue;
    }

    const progressScore = toNumber(
      (evaluation as Record<string, unknown>).progressScore
    );
    const suggestedAction = toSuggestedAction(
      (evaluation as Record<string, unknown>).suggestedAction
    );
    if (progressScore === undefined || !suggestedAction) {
      continue;
    }

    normalized.push({
      step,
      evaluation: {
        progressScore,
        suggestedAction,
      },
    });
  }

  return normalized;
}

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function toSuggestedAction(
  value: unknown
): "continue" | "replan" | "escalate" | null {
  if (value === "continue" || value === "replan" || value === "escalate") {
    return value;
  }

  return null;
}
