import type { TimeoutTier } from "@openplane/types/temporal/agent-timeouts";
import { TIMEOUT_TIERS } from "@openplane/types/temporal/agent-timeouts";
import {
  type AgentCompletedPayload,
  MissionAgentRunInputSchema,
  type MissionAgentRunOutput,
  type SandboxConfig,
  SandboxConfigSchema,
} from "@openplane/types/temporal/mission";
import type {
  AgentMessage,
  AgentMessageEnvelope,
} from "@openplane/types/temporal/mission-messaging";
import type {
  ReflectionEntry,
  StepEvaluation,
} from "@openplane/types/temporal/mission-reflection";
import type { Duration } from "@temporalio/common";
import {
  condition,
  getExternalWorkflowHandle,
  proxyActivities,
  setHandler,
  workflowInfo,
} from "@temporalio/workflow";
import type { SandboxLifecycleActivities } from "../../activities/agents/sandbox-lifecycle";
import type { AgentActivities } from "../../activities/agents/types";
import {
  buildPriorityComparator,
  inboxToMemoryValue,
} from "../../activities/mission/messaging-memory-bridge";
import type { ReflectionActivities } from "../../activities/mission/reflection-types";
import type { MissionActivities } from "../../activities/mission/types";
import { AGENT_CHUNKED_RETRY_POLICY } from "../../config/retry-policies";
import {
  type AgentChainProgress,
  agentChainProgressQuery,
  extendTimeoutSignal,
} from "../agents/signals";
import { currentTimestamp } from "../temporal-utils";
import type { AgentArtifact } from "../types";
import {
  agentCompletedSignal,
  agentInboxDeliverySignal,
  agentReflectionQuery,
  cancelSignal,
  dependencyFailureSignal,
  missionWakeSignal,
} from "../types";

const MAX_REPLANS = 2;
const STUCK_THRESHOLD = 0.3;
const EVALUATION_INTERVAL = 2;
const REFLECTION_BUFFER_CAPACITY = 3;

const SANDBOX_TOOL_NAMES = [
  "sandbox_execute_code",
  "sandbox_run_command",
  "sandbox_read_file",
  "sandbox_write_file",
  "sandbox_list_files",
];

function resolveAgentStatus(
  status: string
): "completed" | "cancelled" | "failed" {
  if (status === "completed") {
    return "completed";
  }
  if (status === "cancelled") {
    return "cancelled";
  }
  return "failed";
}

function resolveTimeoutTier(tools?: string[]): TimeoutTier {
  if (!tools || tools.length === 0) {
    return "standard";
  }

  const heavyTools = new Set([
    "code_generate",
    "codebase_analyze",
    "multi_document_synthesis",
    "deep_research",
    "sandbox_execute_code",
    "sandbox_run_command",
  ]);

  for (const tool of tools) {
    if (heavyTools.has(tool)) {
      return "extended";
    }
  }

  return "standard";
}

function resolveSandboxConfig(
  directConfig: SandboxConfig | undefined,
  memory: Record<string, unknown>
): SandboxConfig | undefined {
  if (directConfig) {
    return directConfig;
  }

  const fromMemory = memory["agent:sandbox_config"];
  const parsed = SandboxConfigSchema.safeParse(fromMemory);
  if (parsed.success) {
    return parsed.data;
  }

  return;
}

function toDuration(value: string): Duration {
  return value as Duration;
}

function createMissionProxy() {
  return proxyActivities<MissionActivities>({
    startToCloseTimeout: "5m",
    heartbeatTimeout: "1m",
    retry: {
      maximumAttempts: 3,
      initialInterval: "2s",
      backoffCoefficient: 2,
    },
  });
}

function createAgentProxy(tier: TimeoutTier) {
  const config = TIMEOUT_TIERS[tier];
  return proxyActivities<Pick<AgentActivities, "executeAgentStep">>({
    startToCloseTimeout: toDuration(config.startToCloseTimeout),
    scheduleToCloseTimeout: toDuration(config.scheduleToCloseTimeout),
    heartbeatTimeout: toDuration(config.heartbeatTimeout),
    retry: {
      maximumAttempts: 2,
      initialInterval: "5s",
      backoffCoefficient: 2,
    },
  });
}

function createChunkedProxy(tier: TimeoutTier) {
  const config = TIMEOUT_TIERS[tier];
  return proxyActivities<Pick<AgentActivities, "executeAgentStepChunked">>({
    startToCloseTimeout: toDuration(config.startToCloseTimeout),
    scheduleToCloseTimeout: toDuration(config.scheduleToCloseTimeout),
    heartbeatTimeout: toDuration(config.heartbeatTimeout),
    retry: AGENT_CHUNKED_RETRY_POLICY,
  });
}

function createSandboxProxy() {
  return proxyActivities<SandboxLifecycleActivities>({
    startToCloseTimeout: "2m",
    retry: {
      maximumAttempts: 2,
      initialInterval: "3s",
      backoffCoefficient: 2,
    },
  });
}

function createReflectionProxy() {
  return proxyActivities<ReflectionActivities>({
    startToCloseTimeout: toDuration("3m"),
    heartbeatTimeout: toDuration("1m"),
    retry: {
      maximumAttempts: 2,
      initialInterval: "2s",
      backoffCoefficient: 2,
    },
  });
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function getArtifactTitle(artifact: AgentArtifact, step: number): string {
  const artifactContent = toRecord(artifact.content);
  const title = artifactContent?.title;
  if (typeof title === "string" && title.length > 0) {
    return title;
  }

  return `Run output - step ${step}`;
}

function getArtifactPreview(content: unknown): string {
  if (typeof content === "string") {
    return content.slice(0, 1200);
  }

  try {
    return JSON.stringify(content).slice(0, 1200);
  } catch {
    return "Output artifact published";
  }
}

function isStuck(evaluation: StepEvaluation): boolean {
  const indicators = evaluation.stuckIndicators;
  const stuckSignals = [
    indicators.repeatingActions,
    indicators.noNewArtifacts,
    indicators.errorLoop,
    indicators.progressPlateau,
  ].filter(Boolean).length;

  return (
    evaluation.progressScore < STUCK_THRESHOLD ||
    evaluation.suggestedAction !== "continue" ||
    stuckSignals >= 2
  );
}

function trimReflectionBuffer(buffer: ReflectionEntry[]): ReflectionEntry[] {
  if (buffer.length <= REFLECTION_BUFFER_CAPACITY) {
    return buffer;
  }

  return buffer.slice(buffer.length - REFLECTION_BUFFER_CAPACITY);
}

export async function missionAgentRunWorkflow(
  rawInput: unknown
): Promise<MissionAgentRunOutput> {
  const input = MissionAgentRunInputSchema.parse(rawInput);
  const activities = createMissionProxy();
  const reflectionActivities = createReflectionProxy();

  let sandboxId: string | undefined;
  let sandboxHost: string | undefined;
  let effectiveTools = input.tools;

  let currentTier = resolveTimeoutTier(effectiveTools);
  let pendingExtension: TimeoutTier | null = null;
  let isCancelled = false;

  const chainProgress: AgentChainProgress = {
    currentStep: 0,
    maxSteps: input.maxSteps,
    currentTier,
    chunksCompletedInStep: 0,
    totalTokensUsed: 0,
    totalCostCents: 0,
    elapsedMs: 0,
    status: "running",
    lastHeartbeat: currentTimestamp(),
  };

  setHandler(cancelSignal, () => {
    isCancelled = true;
    chainProgress.status = "cancelled";
  });

  setHandler(agentChainProgressQuery, () => chainProgress);

  setHandler(extendTimeoutSignal, (payload) => {
    pendingExtension = payload.requestedTier;
    chainProgress.status = "waiting_extension";
  });

  const inbox: AgentMessageEnvelope[] = [];
  const replyIndex = new Map<string, AgentMessage>();
  const priorityComparator = buildPriorityComparator();

  setHandler(agentInboxDeliverySignal, (payload) => {
    const envelope: AgentMessageEnvelope = {
      ...payload.envelope,
      deliveredAt: currentTimestamp(),
    };

    if (envelope.message.kind === "reply" && envelope.message.correlationId) {
      replyIndex.set(envelope.message.correlationId, envelope.message);
    }

    inbox.push(envelope);
  });

  const { context } = await activities.loadMissionContext({
    missionId: input.missionId,
    teamId: input.teamId,
    agentId: input.agentId,
    taskId: input.taskId,
  });

  let steps = 0;
  let tokensUsed = 0;
  let costCents = 0;
  let replanCount = 0;
  const allArtifacts: AgentArtifact[] = [];
  const reflectionBuffer: ReflectionEntry[] = [];
  let activePrompt = input.soulPrompt;
  let status: MissionAgentRunOutput["status"] = "completed";
  const failurePatterns = await loadFailurePatterns(
    activities,
    input.missionId,
    input.agentId
  );

  setHandler(agentReflectionQuery, () => ({
    reflectionBuffer,
    replanCount,
  }));

  try {
    const sandboxConfig = resolveSandboxConfig(
      input.sandboxConfig,
      context.memory
    );
    if (sandboxConfig) {
      const sandboxProxy = createSandboxProxy();
      const sandboxResult = await sandboxProxy.provisionSandbox({
        teamId: input.teamId,
        sandboxConfig,
      });
      sandboxId = sandboxResult.sandboxId;
      sandboxHost = sandboxResult.host;
      effectiveTools = [
        ...new Set([...(input.tools ?? []), ...SANDBOX_TOOL_NAMES]),
      ];
      currentTier = resolveTimeoutTier(effectiveTools);
      chainProgress.currentTier = currentTier;
    }

    await activities.logActivity({
      missionId: input.missionId,
      type: "agent_run_started",
      message: `Agent started working on "${context.taskTitle}"`,
      agentId: input.agentId,
      metadata: {
        agentName: input.agentName,
        taskId: input.taskId,
        runId: input.runId,
        tier: currentTier,
      },
    });

    while (steps < input.maxSteps && !isCancelled) {
      if (pendingExtension) {
        currentTier = pendingExtension;
        chainProgress.currentTier = currentTier;
        pendingExtension = null;
        chainProgress.status = "running";
      }

      steps += 1;
      chainProgress.currentStep = steps;
      chainProgress.chunksCompletedInStep = 0;

      await activities.writeMemory({
        missionId: input.missionId,
        agentId: input.agentId,
        key: "current_step",
        value: {
          step: steps,
          taskId: input.taskId,
          tier: currentTier,
          replanCount,
        },
        scope: "agent",
      });

      const pendingMessages = drainInbox(
        inbox,
        currentTimestamp(),
        priorityComparator
      );

      if (pendingMessages.length > 0) {
        const inboxMemory = inboxToMemoryValue(
          pendingMessages,
          currentTimestamp()
        );

        await activities.writeMemory({
          missionId: input.missionId,
          agentId: input.agentId,
          key: "inbox:latest",
          value: inboxMemory,
          scope: "agent",
        });

        context.memory["agent:inbox:latest"] = inboxMemory;
      }

      const stepContext = {
        prompt: activePrompt,
        taskTitle: context.taskTitle,
        taskDescription: context.taskDescription,
        memory: context.memory,
        teamId: input.teamId,
        missionId: input.missionId,
        agentId: input.agentId,
        runId: input.runId,
        taskId: input.taskId,
        agentName: input.agentName,
        tools: effectiveTools,
        inboxMessages: pendingMessages,
        failurePatterns,
        sandboxId,
        sandboxHost,
        replanContext:
          replanCount > 0
            ? {
                replanNumber: replanCount,
                reflections: reflectionBuffer,
              }
            : undefined,
      };

      const useChunked =
        currentTier === "extended" || currentTier === "marathon";
      const tierConfig = TIMEOUT_TIERS[currentTier];

      let stepArtifacts: AgentArtifact[] = [];
      let stepTokens = 0;
      let stepCost = 0;
      let stepComplete = false;
      let stepTimedOut = false;
      let stepWaitingForReply: string | undefined;
      let stepReplyTimeoutMs: number | undefined;

      if (useChunked) {
        const chunkedActivities = createChunkedProxy(currentTier);
        const stepResult = await chunkedActivities.executeAgentStepChunked({
          sessionId: input.agentId,
          agentType: "mission",
          step: steps,
          previousArtifacts: allArtifacts,
          context: stepContext,
          tier: currentTier,
          maxChunks: tierConfig.maxChunksPerStep,
          checkpointEveryNChunks: tierConfig.checkpointEveryNChunks,
          resumeFromChunk: null,
        });

        stepArtifacts = stepResult.artifacts;
        stepTokens = stepResult.tokensUsed;
        stepCost = stepResult.costCents;
        stepComplete = stepResult.complete;
        stepTimedOut = stepResult.timedOut;
        chainProgress.chunksCompletedInStep = stepResult.chunksExecuted;
      } else {
        const agentActivities = createAgentProxy(currentTier);
        const stepResult = await agentActivities.executeAgentStep({
          sessionId: input.agentId,
          agentType: "mission",
          step: steps,
          previousArtifacts: allArtifacts,
          context: stepContext,
        });

        stepArtifacts = stepResult.artifacts;
        stepTokens = stepResult.tokensUsed;
        stepCost = stepResult.costCents;
        stepComplete = stepResult.complete;
        stepWaitingForReply = stepResult.waitingForReply;
        stepReplyTimeoutMs = stepResult.replyTimeoutMs;
      }

      allArtifacts.push(...stepArtifacts);
      tokensUsed += stepTokens;
      costCents += stepCost;
      chainProgress.totalTokensUsed = tokensUsed;
      chainProgress.totalCostCents = costCents;
      chainProgress.elapsedMs =
        currentTimestamp() - workflowInfo().startTime.getTime();
      chainProgress.lastHeartbeat = currentTimestamp();

      const displayContent =
        stepArtifacts[0]?.summary ??
        (typeof stepArtifacts[0]?.content === "string"
          ? (stepArtifacts[0].content as string)
          : "");
      const preview = displayContent.slice(0, 300);

      await activities.logActivity({
        missionId: input.missionId,
        type: "agent_step_completed",
        message: preview || `Step ${steps} completed`,
        agentId: input.agentId,
        metadata: {
          agentName: input.agentName,
          taskId: input.taskId,
          runId: input.runId,
          step: steps,
          tokensUsed: stepTokens,
          costCents: stepCost,
          tier: currentTier,
          content: displayContent,
        },
      });

      if (input.budgetCentsLimit && costCents >= input.budgetCentsLimit) {
        status = "budget_exceeded";
        await activities.logActivity({
          missionId: input.missionId,
          type: "agent_budget_exceeded",
          message: `Agent exceeded per-run budget: ${costCents}/${input.budgetCentsLimit} cents`,
          agentId: input.agentId,
          metadata: {
            agentName: input.agentName,
            taskId: input.taskId,
            runId: input.runId,
            consumed: costCents,
            limit: input.budgetCentsLimit,
          },
        });
        break;
      }

      const budgetCheck = await activities.updateBudget({
        missionId: input.missionId,
        costCents: stepCost,
      });

      if (budgetCheck.exceeded) {
        status = "budget_exceeded";
        break;
      }

      if (stepWaitingForReply) {
        const correlationId = stepWaitingForReply;
        const arrived = await condition(
          () => replyIndex.has(correlationId) || isCancelled,
          stepReplyTimeoutMs ?? 30_000
        );

        if (arrived && !isCancelled) {
          const reply = replyIndex.get(correlationId);
          if (reply) {
            replyIndex.delete(correlationId);
            await activities.writeMemory({
              missionId: input.missionId,
              agentId: input.agentId,
              key: `reply:${correlationId}`,
              value: reply,
              scope: "agent",
            });
            context.memory[`agent:reply:${correlationId}`] = reply;
          }
        }
      }

      if (stepComplete) {
        break;
      }

      if (stepTimedOut) {
        chainProgress.status = "waiting_extension";
        const gotExtension = await condition(
          () => pendingExtension !== null || isCancelled,
          60_000
        );
        if (!(gotExtension || isCancelled)) {
          status = "completed";
          break;
        }
        chainProgress.status = "running";
      }

      if (
        steps % EVALUATION_INTERVAL === 0 &&
        steps < input.maxSteps &&
        !isCancelled
      ) {
        chainProgress.status = "checkpointing";

        const evaluation = await reflectionActivities.evaluateProgress({
          missionId: input.missionId,
          taskId: input.taskId,
          agentId: input.agentId,
          currentStep: steps,
          maxSteps: input.maxSteps,
          recentArtifacts: allArtifacts.slice(-3),
          reflectionBuffer,
          taskContext: {
            title: context.taskTitle,
            description: context.taskDescription,
          },
        });

        const reflectionEntry: ReflectionEntry = {
          step: steps,
          evaluation,
          approach: activePrompt.slice(0, 200),
          outcome: preview,
          timestamp: currentTimestamp(),
        };
        reflectionBuffer.push(reflectionEntry);
        const trimmedBuffer = trimReflectionBuffer(reflectionBuffer);
        reflectionBuffer.length = 0;
        reflectionBuffer.push(...trimmedBuffer);

        await activities.writeMemory({
          missionId: input.missionId,
          agentId: input.agentId,
          key: "reflection_buffer",
          value: reflectionBuffer,
          scope: "agent",
        });

        await activities.logActivity({
          missionId: input.missionId,
          type: "agent_self_evaluated",
          message: `Progress: ${(evaluation.progressScore * 100).toFixed(0)}%, Confidence: ${(evaluation.confidenceScore * 100).toFixed(0)}% - ${evaluation.suggestedAction}`,
          agentId: input.agentId,
          metadata: {
            step: steps,
            progressScore: evaluation.progressScore,
            confidenceScore: evaluation.confidenceScore,
            stuckIndicators: evaluation.stuckIndicators,
            suggestedAction: evaluation.suggestedAction,
          },
        });

        if (isStuck(evaluation)) {
          const shouldEscalateNow =
            evaluation.suggestedAction === "escalate" ||
            replanCount >= MAX_REPLANS;

          if (shouldEscalateNow) {
            await handleEscalation({
              activities,
              reflectionActivities,
              input,
              context,
              reflectionBuffer,
              replanCount,
            });
            await signalDependencyFailure(input.missionId, {
              failedTaskId: input.taskId,
              failedTaskTitle: context.taskTitle,
              reason: "Agent escalated after exhausting replans",
              blockedTaskIds: [],
            });
            await signalMissionWake(input.missionId, {
              escalated: true,
              taskId: input.taskId,
              agentId: input.agentId,
              replanCount,
            });
            status = "failed";
            break;
          }

          const replanResult = await reflectionActivities.generateReplan({
            missionId: input.missionId,
            taskId: input.taskId,
            agentId: input.agentId,
            currentApproach: activePrompt,
            reflectionBuffer,
            failurePatterns,
            taskContext: {
              title: context.taskTitle,
              description: context.taskDescription,
              priorAttempts: replanCount,
            },
          });

          activePrompt = replanResult.adjustedPrompt;
          replanCount += 1;

          await activities.logActivity({
            missionId: input.missionId,
            type: "agent_replanned",
            message: `Replan #${replanCount}: ${replanResult.strategyShift}`,
            agentId: input.agentId,
            metadata: {
              replanCount,
              strategyShift: replanResult.strategyShift,
              reasoning: replanResult.reasoning,
              taskId: input.taskId,
              runId: input.runId,
            },
          });

          const updatedPatterns = await storeFailurePattern({
            activities,
            missionId: input.missionId,
            agentId: input.agentId,
            pattern: evaluation.reasoning,
            taskTitle: context.taskTitle,
          });
          failurePatterns.length = 0;
          failurePatterns.push(...updatedPatterns);
        }

        chainProgress.status = "running";
      }
    }

    if (isCancelled) {
      status = "cancelled";
    }

    if (status === "completed" && allArtifacts.length > 0) {
      const criticEnabled = await activities.readMemory({
        missionId: input.missionId,
        key: "critic_enabled",
        scope: "mission",
      });

      if (criticEnabled === true) {
        const criticReview = await reflectionActivities.criticReview({
          missionId: input.missionId,
          taskId: input.taskId,
          agentId: input.agentId,
          artifacts: allArtifacts,
          taskContext: {
            title: context.taskTitle,
            description: context.taskDescription,
          },
        });

        await activities.logActivity({
          missionId: input.missionId,
          type: "critic_review_completed",
          message: `Critic: ${criticReview.recommendation} (quality: ${(criticReview.qualityScore * 100).toFixed(0)}%)`,
          agentId: input.agentId,
          metadata: {
            qualityScore: criticReview.qualityScore,
            recommendation: criticReview.recommendation,
            issues: criticReview.issues,
            taskId: input.taskId,
            runId: input.runId,
          },
        });

        if (criticReview.recommendation === "reject") {
          status = "failed";
          await activities.logActivity({
            missionId: input.missionId,
            type: "critic_rejected",
            message: `Critic rejected output: ${criticReview.issues
              .filter((issue) => issue.severity === "blocking")
              .map((issue) => issue.description)
              .join("; ")}`,
            agentId: input.agentId,
            metadata: {
              taskId: input.taskId,
              runId: input.runId,
            },
          });
        }
      }
    }

    await activities.postComment({
      taskId: input.taskId,
      fromAgentId: input.agentId,
      content:
        status === "completed"
          ? `Task completed in ${steps} step(s)${replanCount > 0 ? ` with ${replanCount} replan(s)` : ""}.`
          : `Run ended with status: ${status} after ${steps} step(s).`,
    });

    if (status === "completed") {
      await activities.completeTask({
        taskId: input.taskId,
        agentId: input.agentId,
      });
    }
  } catch (error) {
    status = "failed";

    await activities.logActivity({
      missionId: input.missionId,
      type: "agent_run_failed",
      message: `Agent run failed: ${error instanceof Error ? error.message : String(error)}`,
      agentId: input.agentId,
      metadata: {
        agentName: input.agentName,
        taskId: input.taskId,
        runId: input.runId,
      },
    });
  }

  let runStatus: "COMPLETED" | "CANCELLED" | "FAILED";
  if (status === "completed") {
    runStatus = "COMPLETED";
  } else if (status === "cancelled") {
    runStatus = "CANCELLED";
  } else {
    runStatus = "FAILED";
  }

  await activities.updateRun({
    runId: input.runId,
    status: runStatus,
    completedAt: currentTimestamp(),
    tokensUsed,
    costCents,
    artifacts: allArtifacts,
    ...(status === "failed" ? { error: "Agent run failed" } : {}),
  });

  const finalArtifact = allArtifacts.at(-1);
  if (finalArtifact && status !== "failed") {
    const artifactTitle = getArtifactTitle(finalArtifact, steps);
    const contentPreview = finalArtifact.summary
      ? finalArtifact.summary.slice(0, 1200)
      : getArtifactPreview(finalArtifact.content);

    await activities.logActivity({
      missionId: input.missionId,
      type: "artifact.published",
      message: `Output published: ${artifactTitle}`,
      agentId: input.agentId,
      metadata: {
        agentName: input.agentName,
        taskId: input.taskId,
        runId: input.runId,
        artifactId: finalArtifact.id,
        artifactType: finalArtifact.type,
        artifactTitle,
        content: contentPreview,
        artifactCount: allArtifacts.length,
      },
    });
  }

  await activities.logActivity({
    missionId: input.missionId,
    type: "agent_run_completed",
    message: `Agent run ${status}. Steps: ${steps}, Tokens: ${tokensUsed}, Replans: ${replanCount}`,
    agentId: input.agentId,
    metadata: {
      agentName: input.agentName,
      taskId: input.taskId,
      runId: input.runId,
      steps,
      tokensUsed,
      costCents,
      status,
      tier: currentTier,
      replanCount,
      reflectionCount: reflectionBuffer.length,
    },
  });

  chainProgress.status = isCancelled ? "cancelled" : "completed";

  if (sandboxId) {
    const sandboxProxy = createSandboxProxy();
    await sandboxProxy
      .destroySandbox({ sandboxId, teamId: input.teamId })
      .catch(() => {
        /* sandbox may already be destroyed */
      });
  }

  await signalAgentCompleted(input.missionId, {
    agentId: input.agentId,
    runId: input.runId,
    status: resolveAgentStatus(status),
    costCents,
    completedTasks: status === "completed" ? 1 : 0,
    error: status === "failed" ? "Agent run failed" : undefined,
  });

  return {
    runId: input.runId,
    taskId: input.taskId,
    agentId: input.agentId,
    steps,
    tokensUsed,
    costCents,
    artifacts: allArtifacts,
    status,
  };
}

async function handleEscalation(input: {
  activities: MissionActivities;
  reflectionActivities: ReflectionActivities;
  input: {
    missionId: string;
    taskId: string;
    agentId: string;
    runId: string;
  };
  context: {
    taskTitle: string;
  };
  reflectionBuffer: ReflectionEntry[];
  replanCount: number;
}): Promise<void> {
  await input.reflectionActivities.escalate({
    missionId: input.input.missionId,
    taskId: input.input.taskId,
    agentId: input.input.agentId,
    reason: `Agent exhausted ${input.replanCount} replans without sufficient progress`,
    reflectionBuffer: input.reflectionBuffer,
    attemptedApproaches: input.reflectionBuffer.map((entry) => entry.approach),
    suggestedNextSteps: [
      "Reassign to a different agent with different capabilities",
      "Break task into smaller sub-tasks",
      "Request human guidance on approach",
    ],
  });

  await input.activities.logActivity({
    missionId: input.input.missionId,
    type: "agent_escalated",
    message: `Agent escalated task "${input.context.taskTitle}" after ${input.replanCount} failed replans`,
    agentId: input.input.agentId,
    metadata: {
      taskId: input.input.taskId,
      runId: input.input.runId,
      replanCount: input.replanCount,
      reflectionCount: input.reflectionBuffer.length,
    },
  });
}

async function loadFailurePatterns(
  activities: MissionActivities,
  missionId: string,
  agentId: string
): Promise<string[]> {
  const [agentScoped, missionScoped] = await Promise.all([
    activities.readMemory({
      missionId,
      agentId,
      key: "failure_patterns",
      scope: "agent",
    }),
    activities.readMemory({
      missionId,
      key: "failure_patterns",
      scope: "mission",
    }),
  ]);

  const agentPatterns = Array.isArray(agentScoped)
    ? agentScoped.filter((entry): entry is string => typeof entry === "string")
    : [];
  const missionPatterns = Array.isArray(missionScoped)
    ? missionScoped.filter(
        (entry): entry is string => typeof entry === "string"
      )
    : [];

  return [...new Set([...agentPatterns, ...missionPatterns])];
}

async function storeFailurePattern(input: {
  activities: MissionActivities;
  missionId: string;
  agentId: string;
  pattern: string;
  taskTitle: string;
}): Promise<string[]> {
  const entry = `[${input.taskTitle}] ${input.pattern}`;

  const existingAgentScoped = await input.activities.readMemory({
    missionId: input.missionId,
    agentId: input.agentId,
    key: "failure_patterns",
    scope: "agent",
  });
  const existingMissionScoped = await input.activities.readMemory({
    missionId: input.missionId,
    key: "failure_patterns",
    scope: "mission",
  });

  const agentPatterns = Array.isArray(existingAgentScoped)
    ? existingAgentScoped.filter(
        (candidate): candidate is string => typeof candidate === "string"
      )
    : [];
  const missionPatterns = Array.isArray(existingMissionScoped)
    ? existingMissionScoped.filter(
        (candidate): candidate is string => typeof candidate === "string"
      )
    : [];

  const updatedAgentPatterns = [...agentPatterns, entry].slice(-10);
  const updatedMissionPatterns = [...missionPatterns, entry].slice(-50);

  await Promise.all([
    input.activities.writeMemory({
      missionId: input.missionId,
      agentId: input.agentId,
      key: "failure_patterns",
      value: updatedAgentPatterns,
      scope: "agent",
    }),
    input.activities.writeMemory({
      missionId: input.missionId,
      key: "failure_patterns",
      value: updatedMissionPatterns,
      scope: "mission",
    }),
  ]);

  return [...new Set([...updatedAgentPatterns, ...updatedMissionPatterns])];
}

async function signalMissionWake(
  missionId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    const handle = getExternalWorkflowHandle(`mission:${missionId}`);
    await handle.signal(missionWakeSignal, {
      missionId,
      reason: "run_complete",
      metadata,
    });
  } catch {
    return;
  }
}

async function signalDependencyFailure(
  missionId: string,
  payload: {
    failedTaskId: string;
    failedTaskTitle: string;
    reason: string;
    blockedTaskIds: string[];
  }
): Promise<void> {
  try {
    const handle = getExternalWorkflowHandle(`mission:${missionId}`);
    await handle.signal(dependencyFailureSignal, payload);
  } catch {
    return;
  }
}

async function signalAgentCompleted(
  missionId: string,
  payload: AgentCompletedPayload
): Promise<void> {
  try {
    const parentId = workflowInfo().parent?.workflowId;
    const targetId = parentId ?? `mission:${missionId}`;
    const handle = getExternalWorkflowHandle(targetId);
    await handle.signal(agentCompletedSignal, payload);
  } catch {
    return;
  }
}

function drainInbox(
  inbox: AgentMessageEnvelope[],
  now: number,
  comparator: (a: AgentMessage, b: AgentMessage) => number
): AgentMessage[] {
  const drained = inbox.splice(0, inbox.length);

  return drained
    .map((envelope) => envelope.message)
    .filter((message) => !message.expiresAt || message.expiresAt > now)
    .sort(comparator);
}
