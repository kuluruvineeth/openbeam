import {
  BackgroundAgentInputSchema,
  type BackgroundAgentOutput,
} from "@openplane/types/temporal/workflows";
import {
  continueAsNew,
  proxyActivities,
  setHandler,
  workflowInfo,
} from "@temporalio/workflow";
import type { AgentActivities } from "../../activities/agents/types";
import {
  type AgentState,
  agentProgressQuery,
  artifactsQuery,
  cancelSignal,
  updateConfigSignal,
} from "../types";

const agentActivities = proxyActivities<AgentActivities>({
  startToCloseTimeout: "10m",
  heartbeatTimeout: "1m",
  retry: { maximumAttempts: 3 },
});

export async function backgroundAgentWorkflow(
  rawInput: unknown
): Promise<BackgroundAgentOutput> {
  const input = BackgroundAgentInputSchema.parse(rawInput);
  const state: AgentState = {
    steps: 0,
    artifacts: [],
    status: "running",
    lastCheckpoint: null,
  };

  setHandler(agentProgressQuery, () => state);

  setHandler(artifactsQuery, () => state.artifacts);

  setHandler(cancelSignal, () => {
    state.status = "cancelled";
  });

  setHandler(updateConfigSignal, (config) => {
    state.config = { ...state.config, ...config };
  });

  while (state.status === "running" && state.steps < input.maxSteps) {
    const stepResult = await agentActivities.executeAgentStep({
      sessionId: input.sessionId,
      agentType: input.agentType,
      step: state.steps,
      previousArtifacts: state.artifacts,
      context: input.context,
    });

    state.steps += 1;
    state.artifacts = [...state.artifacts, ...stepResult.artifacts];
    state.lastCheckpoint = stepResult.checkpoint;

    if (stepResult.complete) {
      state.status = "completed";
      break;
    }

    if (workflowInfo().historyLength > 5000) {
      return continueAsNew<typeof backgroundAgentWorkflow>({
        ...input,
        initialPrompt: `Continue from checkpoint: ${JSON.stringify(state.lastCheckpoint)}`,
      });
    }
  }

  await agentActivities.finalizeAgentSession({
    sessionId: input.sessionId,
    artifacts: state.artifacts,
    status: state.status,
  });

  return {
    sessionId: input.sessionId,
    steps: state.steps,
    artifacts: state.artifacts,
    status: state.status === "running" ? "completed" : state.status,
  };
}
