import { WorkflowNotFoundError } from "@temporalio/client";
import { getTemporalClient } from "../client";
import { TASK_QUEUES } from "../config/task-queues";
import { generateWorkflowId } from "../utils/workflow-id";
import type {
  CleanupInput,
  CleanupOutput,
  ConnectorCleanupInput,
  ConnectorCleanupOutput,
} from "../workflows/types";

export interface RunCleanupOptions {
  type: "DAILY" | "DELETION_SYNC";
  teamId?: string;
}

export interface RunConnectorCleanupOptions {
  connectorId: string;
  teamId: string;
}

export interface CleanupHandle {
  workflowId: string;
  runId: string;
}

export async function runDailyCleanup(
  options?: Partial<RunCleanupOptions>
): Promise<CleanupHandle> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({
    type: "cleanup",
    connectorId: "daily",
  });

  const input: CleanupInput = {
    type: options?.type ?? "DAILY",
    teamId: options?.teamId,
  };

  const handle = await client.workflow.start("cleanupWorkflow", {
    taskQueue: TASK_QUEUES.MAINTENANCE,
    workflowId,
    args: [input],
    memo: {
      type: input.type,
    },
  });

  return {
    workflowId: handle.workflowId,
    runId: handle.firstExecutionRunId,
  };
}

export async function runConnectorCleanup(
  options: RunConnectorCleanupOptions
): Promise<CleanupHandle> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({
    type: "cleanup",
    connectorId: options.connectorId,
  });

  const input: ConnectorCleanupInput = {
    connectorId: options.connectorId,
    teamId: options.teamId,
    scheduledAt: Date.now(),
  };

  const handle = await client.workflow.start("connectorCleanupWorkflow", {
    taskQueue: TASK_QUEUES.MAINTENANCE,
    workflowId,
    args: [input],
    memo: {
      connectorId: options.connectorId,
    },
  });

  return {
    workflowId: handle.workflowId,
    runId: handle.firstExecutionRunId,
  };
}

export async function awaitCleanupResult(
  workflowId: string
): Promise<CleanupOutput | ConnectorCleanupOutput | null> {
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

export async function cancelConnectorCleanup(
  connectorId: string
): Promise<boolean> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({
    type: "cleanup",
    connectorId,
  });

  try {
    const handle = client.workflow.getHandle(workflowId);
    await handle.cancel();
    return true;
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return false;
    }
    throw error;
  }
}

export async function getConnectorCleanupStatus(
  connectorId: string
): Promise<{ running: boolean; status?: string }> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({
    type: "cleanup",
    connectorId,
  });

  try {
    const handle = client.workflow.getHandle(workflowId);
    const description = await handle.describe();
    return {
      running: description.status.name === "RUNNING",
      status: description.status.name,
    };
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return { running: false };
    }
    throw error;
  }
}
