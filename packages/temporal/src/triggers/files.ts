import { WorkflowNotFoundError } from "@temporalio/client";
import { getTemporalClient } from "../client";
import { TASK_QUEUES } from "../config/task-queues";
import { generateWorkflowId } from "../utils/workflow-id";
import type {
  FileProcessingInput,
  FileProcessingOutput,
} from "../workflows/types";

export interface ProcessFileOptions {
  connectorId: string;
  externalId: string;
  mimeType: string;
  downloadUrl: string;
  fileName?: string;
  fileSize?: number;
}

export interface FileHandle {
  workflowId: string;
  runId: string;
}

export async function processFile(
  options: ProcessFileOptions
): Promise<FileHandle> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({
    type: "file",
    documentId: options.externalId,
  });

  const input: FileProcessingInput = {
    connectorId: options.connectorId,
    externalId: options.externalId,
    mimeType: options.mimeType,
    downloadUrl: options.downloadUrl,
  };

  const handle = await client.workflow.start("fileProcessingWorkflow", {
    taskQueue: TASK_QUEUES.FILE_PROCESSING,
    workflowId,
    args: [input],
    memo: {
      connectorId: options.connectorId,
      fileName: options.fileName,
      mimeType: options.mimeType,
    },
  });

  return {
    workflowId: handle.workflowId,
    runId: handle.firstExecutionRunId,
  };
}

export async function awaitFileProcessingResult(
  workflowId: string
): Promise<FileProcessingOutput | null> {
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

export function processFileBatch(
  files: ProcessFileOptions[]
): Promise<FileHandle[]> {
  return Promise.all(files.map((file) => processFile(file)));
}

export async function getActiveFileProcessingJobs(
  connectorId: string
): Promise<FileHandle[]> {
  const client = await getTemporalClient();

  const workflows = client.workflow.list({
    query: `ExecutionStatus = "Running" AND WorkflowType = "fileProcessingWorkflow"`,
  });

  const handles: FileHandle[] = [];
  for await (const workflow of workflows) {
    const memo = workflow.memo as Record<string, unknown> | undefined;
    if (memo?.connectorId === connectorId) {
      handles.push({
        workflowId: workflow.workflowId,
        runId: workflow.runId,
      });
    }
  }

  return handles;
}
