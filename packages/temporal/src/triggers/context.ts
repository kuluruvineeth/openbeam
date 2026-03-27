import { WorkflowExecutionAlreadyStartedError } from "@temporalio/client";
import { getTemporalClient } from "../client";
import { TASK_QUEUES } from "../config/task-queues";

export interface MemoryExtractionHandle {
  workflowId: string;
  runId: string;
}

export interface StartMemoryExtractionOptions {
  sessionId: string;
  teamId: string;
  userId: string;
  agentId?: string | null;
}

export async function startMemoryExtraction(
  options: StartMemoryExtractionOptions
): Promise<MemoryExtractionHandle> {
  const client = await getTemporalClient();
  const workflowId = `memory-extraction:${options.sessionId}`;

  try {
    const handle = await client.workflow.start("memoryExtractionWorkflow", {
      taskQueue: TASK_QUEUES.CONTEXT_ENRICHMENT,
      workflowId,
      args: [
        {
          sessionId: options.sessionId,
          teamId: options.teamId,
          userId: options.userId,
          agentId: options.agentId ?? null,
        },
      ],
    });

    return {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId,
    };
  } catch (error) {
    if (error instanceof WorkflowExecutionAlreadyStartedError) {
      return { workflowId, runId: "" };
    }
    throw error;
  }
}
