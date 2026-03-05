import type { TimeoutTier } from "@openplane/types/temporal/agent-timeouts";
import { TIMEOUT_TIERS } from "@openplane/types/temporal/agent-timeouts";
import {
  BackgroundAgentInputSchema,
  type BackgroundAgentOutput,
} from "@openplane/types/temporal/workflows";
import type { Duration } from "@temporalio/common";
import {
  continueAsNew,
  proxyActivities,
  setHandler,
  workflowInfo,
} from "@temporalio/workflow";
import type { AgentActivities } from "../../activities/agents/types";
import { AGENT_CHUNKED_RETRY_POLICY } from "../../config/retry-policies";
import { conditionWithTimeout, currentTimestamp } from "../temporal-utils";
import {
  type AgentState,
  agentProgressQuery,
  artifactsQuery,
  cancelSignal,
  updateConfigSignal,
} from "../types";
import {
  type AgentChainProgress,
  agentChainProgressQuery,
  extendTimeoutSignal,
} from "./signals";

function resolveTimeoutTier(agentType: string, override?: string): TimeoutTier {
  const agentTierMap: Record<string, TimeoutTier> = {
    "quick-answer": "quick",
    research: "standard",
    "code-generation": "extended",

    "deep-analysis": "extended",
    "codebase-migration": "marathon",
  };

  if (override && override in TIMEOUT_TIERS) {
    return override as TimeoutTier;
  }

  return agentTierMap[agentType] ?? "standard";
}

function toDuration(value: string): Duration {
  return value as Duration;
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

function createStandardProxy(tier: TimeoutTier) {
  const config = TIMEOUT_TIERS[tier];
  return proxyActivities<
    Pick<AgentActivities, "executeAgentStep" | "finalizeAgentSession">
  >({
    startToCloseTimeout: toDuration(config.startToCloseTimeout),
    scheduleToCloseTimeout: toDuration(config.scheduleToCloseTimeout),
    heartbeatTimeout: toDuration(config.heartbeatTimeout),
    retry: {
      maximumAttempts: 3,
      initialInterval: "5s",
      backoffCoefficient: 2,
    },
  });
}

export async function backgroundAgentWorkflow(
  rawInput: unknown
): Promise<BackgroundAgentOutput> {
  const input = BackgroundAgentInputSchema.parse(rawInput);
  let currentTier = resolveTimeoutTier(
    input.agentType,
    input.context.timeoutTier as string | undefined
  );

  const state: AgentState = {
    steps: 0,
    artifacts: [],
    status: "running",
    lastCheckpoint: null,
  };
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
  let pendingExtension: TimeoutTier | null = null;

  setHandler(agentProgressQuery, () => state);
  setHandler(artifactsQuery, () => state.artifacts);
  setHandler(agentChainProgressQuery, () => chainProgress);

  setHandler(cancelSignal, () => {
    state.status = "cancelled";
    chainProgress.status = "cancelled";
  });

  setHandler(updateConfigSignal, (config) => {
    state.config = { ...state.config, ...config };
  });

  setHandler(extendTimeoutSignal, (payload) => {
    pendingExtension = payload.requestedTier;
    chainProgress.status = "waiting_extension";
  });

  while (state.status === "running" && state.steps < input.maxSteps) {
    if (pendingExtension) {
      currentTier = pendingExtension;
      chainProgress.currentTier = currentTier;
      pendingExtension = null;
      chainProgress.status = "running";
    }

    const tierConfig = TIMEOUT_TIERS[currentTier];
    const useChunked = currentTier === "extended" || currentTier === "marathon";
    const stepContext = {
      ...input.context,
      initialPrompt: input.initialPrompt,
      ...(state.config ?? {}),
    };
    chainProgress.currentStep = state.steps;
    chainProgress.chunksCompletedInStep = 0;

    if (useChunked) {
      const chunkedActivities = createChunkedProxy(currentTier);
      const stepResult = await chunkedActivities.executeAgentStepChunked({
        sessionId: input.sessionId,
        agentType: input.agentType,
        step: state.steps,
        previousArtifacts: state.artifacts,
        context: stepContext,
        tier: currentTier,
        maxChunks: tierConfig.maxChunksPerStep,
        checkpointEveryNChunks: tierConfig.checkpointEveryNChunks,
        resumeFromChunk: null,
      });

      state.steps += 1;
      state.artifacts = [...state.artifacts, ...stepResult.artifacts];
      state.lastCheckpoint = stepResult.checkpoint;
      chainProgress.chunksCompletedInStep = stepResult.chunksExecuted;
      chainProgress.totalTokensUsed += stepResult.tokensUsed;
      chainProgress.totalCostCents += stepResult.costCents;
      chainProgress.lastHeartbeat = currentTimestamp();

      if (stepResult.complete) {
        state.status = "completed";
        break;
      }

      if (stepResult.timedOut) {
        chainProgress.status = "waiting_extension";
        const gotExtension = await conditionWithTimeout(
          () => pendingExtension !== null || state.status !== "running",
          60_000
        );
        if (!gotExtension && state.status === "running") {
          state.status = "completed";
          break;
        }
        chainProgress.status = "running";
        continue;
      }
    } else {
      const standardActivities = createStandardProxy(currentTier);
      const stepResult = await standardActivities.executeAgentStep({
        sessionId: input.sessionId,
        agentType: input.agentType,
        step: state.steps,
        previousArtifacts: state.artifacts,
        context: stepContext,
      });

      state.steps += 1;
      state.artifacts = [...state.artifacts, ...stepResult.artifacts];
      state.lastCheckpoint = stepResult.checkpoint;
      chainProgress.totalTokensUsed += stepResult.tokensUsed;
      chainProgress.totalCostCents += stepResult.costCents;
      chainProgress.lastHeartbeat = currentTimestamp();

      if (stepResult.complete) {
        state.status = "completed";
        break;
      }
    }

    chainProgress.elapsedMs =
      currentTimestamp() - workflowInfo().startTime.getTime();

    if (workflowInfo().historyLength > 5000) {
      return continueAsNew<typeof backgroundAgentWorkflow>({
        ...input,
        initialPrompt: `Continue from checkpoint: ${JSON.stringify(state.lastCheckpoint)}`,
        context: {
          ...input.context,
          timeoutTier: currentTier,
        },
      });
    }
  }

  const finalizeActivities = createStandardProxy("quick");
  await finalizeActivities.finalizeAgentSession({
    sessionId: input.sessionId,
    artifacts: state.artifacts,
    status: state.status,
  });
  chainProgress.status =
    state.status === "cancelled" ? "cancelled" : "completed";

  return {
    sessionId: input.sessionId,
    steps: state.steps,
    artifacts: state.artifacts,
    status: state.status === "running" ? "completed" : state.status,
  };
}
