import type { Database } from "@openplane/db";
import type { LoadAgentContextInput } from "./types";

interface DbWithMissionMemory {
  missionMemory: {
    findMany: (args: {
      where: { agentId: string };
      take: number;
      orderBy: { updatedAt: string };
      select: { key: true; value: true; scope: true };
    }) => Promise<Array<{ key: string; value: unknown; scope: string }>>;
  };
}

export interface LoadAgentContextDependencies {
  db: Database;
}

interface LoadAgentContextOptions {
  maxMemoryKeys?: number;
}

const DEFAULT_MAX_MEMORY_KEYS = 50;

export function createLoadAgentContextActivity(
  deps: LoadAgentContextDependencies,
  options?: LoadAgentContextOptions
) {
  const maxMemoryKeys = options?.maxMemoryKeys ?? DEFAULT_MAX_MEMORY_KEYS;

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

    const memoryEntries: Array<{ key: string; value: unknown; scope: string }> =
      await (deps.db as unknown as DbWithMissionMemory).missionMemory.findMany({
        where: { agentId: input.sessionId },
        take: maxMemoryKeys,
        orderBy: { updatedAt: "desc" },
        select: { key: true, value: true, scope: true },
      });

    const workingMemory: Record<string, unknown> = {};
    for (const entry of memoryEntries) {
      workingMemory[entry.key] = entry.value;
    }

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
      workingMemory,
    };
  };
}
