import { WorkflowNotFoundError } from "@temporalio/client";
import { getTemporalClient } from "../client";
import { TASK_QUEUES } from "../config/task-queues";
import { generateWorkflowId } from "../utils/workflow-id";
import type {
  IndexDocumentsInput,
  IndexDocumentsOutput,
} from "../workflows/types";

export interface IndexableDocument {
  id: string;
  title?: string;
  content?: string;
  checksum?: string;
  metadata?: Record<string, unknown>;
}

export interface IndexDocumentsOptions {
  connectorId: string;
  documents: IndexableDocument[];
  batchSize?: number;
  syncHistoryId?: string;
}

export interface IndexHandle {
  workflowId: string;
  runId: string;
}

export async function indexDocuments(
  options: IndexDocumentsOptions
): Promise<IndexHandle> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({
    type: "index",
    connectorId: options.connectorId,
  });

  const input: IndexDocumentsInput = {
    connectorId: options.connectorId,
    documents: options.documents,
    batchSize: options.batchSize ?? 100,
  };

  const handle = await client.workflow.start("indexDocumentsWorkflow", {
    taskQueue: TASK_QUEUES.DEFAULT,
    workflowId,
    args: [input],
    memo: {
      connectorId: options.connectorId,
      documentCount: options.documents.length,
      syncHistoryId: options.syncHistoryId,
    },
  });

  return {
    workflowId: handle.workflowId,
    runId: handle.firstExecutionRunId,
  };
}

export async function awaitIndexResult(
  workflowId: string
): Promise<IndexDocumentsOutput | null> {
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
