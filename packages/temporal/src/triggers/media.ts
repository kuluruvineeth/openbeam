import { WorkflowNotFoundError } from "@temporalio/client";
import { getTemporalClient } from "../client";
import { TASK_QUEUES } from "../config/task-queues";
import { generateWorkflowId } from "../utils/workflow-id";
import type {
  MediaProcessingInput,
  MediaProcessingOutput,
} from "../workflows/types";

export interface ProcessMediaOptions {
  connectorId: string;
  mediaId: string;
  sourceUrl: string;
  mediaType: "video" | "audio";
  fileName?: string;
  durationSeconds?: number;
}

export interface MediaHandle {
  workflowId: string;
  runId: string;
}

export async function processMedia(
  options: ProcessMediaOptions
): Promise<MediaHandle> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({
    type: "media",
    documentId: options.mediaId,
  });

  const input: MediaProcessingInput = {
    connectorId: options.connectorId,
    mediaId: options.mediaId,
    mediaType: options.mediaType,
    sourceUrl: options.sourceUrl,
  };

  const handle = await client.workflow.start("mediaProcessingWorkflow", {
    taskQueue: TASK_QUEUES.MEDIA_PROCESSING,
    workflowId,
    args: [input],
    memo: {
      connectorId: options.connectorId,
      mediaType: options.mediaType,
      fileName: options.fileName,
    },
  });

  return {
    workflowId: handle.workflowId,
    runId: handle.firstExecutionRunId,
  };
}

export async function awaitMediaResult(
  workflowId: string
): Promise<MediaProcessingOutput | null> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    return await handle.result();
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return null;
    }
    throw error;
  }
}
