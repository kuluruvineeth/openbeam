import type { Database } from "@openplane/db";
import type { LoadAgentContextInput } from "./types";

export interface LoadAgentContextDependencies {
  db: Database;
}

interface LoadAgentContextOptions {
  maxMemoryKeys?: number;
}

export function createLoadAgentContextActivity(
  deps: LoadAgentContextDependencies,
  _options?: LoadAgentContextOptions
) {
  return async function loadAgentContext(
    input: LoadAgentContextInput
  ): Promise<Record<string, unknown>> {
    const [agent, latestCheckpoint] = await Promise.all([
      deps.db.backgroundAgent.findUnique({
        where: { id: input.sessionId },
      }),
      deps.db.backgroundAgentCheckpoint.findFirst({
        where: { agentId: input.sessionId },
        orderBy: { version: "desc" },
        select: {
          state: true,
          memorySnapshot: true,
          contextWindow: true,
          stepIndex: true,
        },
      }),
    ]);

    if (!agent) {
      return {};
    }

    const checkpointState =
      (latestCheckpoint?.state as Record<string, unknown>) ?? {};
    const memorySnapshot =
      (latestCheckpoint?.memorySnapshot as Record<string, unknown>) ?? {};
    const contextWindow = (latestCheckpoint?.contextWindow as unknown[]) ?? [];

    return {
      agentId: agent.id,
      agentName: agent.name,
      prompt: agent.prompt,
      preset: agent.preset,
      teamId: agent.teamId,
      userId: agent.userId,
      status: agent.status,
      step: latestCheckpoint?.stepIndex ?? 0,
      checkpointState,
      memorySnapshot,
      contextWindow,
      workingMemory: {},
    };
  };
}
