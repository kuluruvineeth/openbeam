import type { Database } from "@openplane/db";
import { createExecuteAgentStepActivity } from "./execute-agent-step";
import { createFinalizeAgentSessionActivity } from "./finalize-agent-session";
import { createLoadAgentContextActivity } from "./load-agent-context";
import { createSaveAgentCheckpointActivity } from "./save-agent-checkpoint";
import type { AgentActivities, AgentExecutor } from "./types";

export interface AgentActivityDependencies {
  db: Database;
  executor: AgentExecutor;
}

export function createAgentActivities(
  deps: AgentActivityDependencies
): AgentActivities {
  return {
    executeAgentStep: createExecuteAgentStepActivity({
      executor: deps.executor,
    }),
    finalizeAgentSession: createFinalizeAgentSessionActivity({ db: deps.db }),
    loadAgentContext: createLoadAgentContextActivity({ db: deps.db }),
    saveAgentCheckpoint: createSaveAgentCheckpointActivity({ db: deps.db }),
  };
}

export { LlmAgentExecutor } from "./llm-agent-executor";
export type { AgentActivities, AgentExecutor };
export type {
  ExecuteAgentStepInput,
  ExecuteAgentStepOutput,
  FinalizeAgentSessionInput,
  LoadAgentContextInput,
  SaveAgentCheckpointInput,
} from "./types";
