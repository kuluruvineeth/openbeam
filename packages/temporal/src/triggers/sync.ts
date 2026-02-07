import {
  WorkflowExecutionAlreadyStartedError,
  WorkflowNotFoundError,
} from "@temporalio/client";
import { getTemporalClient } from "../client";
import { getTaskQueueForConnector } from "../config/task-queues";
import { generateWorkflowId } from "../utils/workflow-id";
import type {
  ConnectorSyncInput,
  ConnectorSyncOutput,
  SyncCursor,
  SyncState,
} from "../workflows/types";
import {
  cancelSignal,
  pauseSignal,
  progressQuery,
  resumeSignal,
} from "../workflows/types";

export type SyncTrigger = "SCHEDULE" | "MANUAL" | "WEBHOOK";
export type SyncType = "FULL" | "INCREMENTAL" | "PERMISSIONS";

export interface StartSyncOptions {
  connectorId: string;
  connectorType: string;
  syncType: SyncType;
  trigger: SyncTrigger;
  syncHistoryId?: string;
  cursor?: SyncCursor;
  requestId?: string;
  userId?: string;
  teamId?: string;
}

export interface SyncHandle {
  workflowId: string;
  runId: string;
}

export interface SyncProgress extends SyncState {
  workflowId: string;
}

export async function startConnectorSync(
  options: StartSyncOptions
): Promise<SyncHandle> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({
    type: "sync",
    connectorId: options.connectorId,
  });

  const input: ConnectorSyncInput = {
    connectorId: options.connectorId,
    syncHistoryId: options.syncHistoryId,
    syncType: options.syncType,
    trigger: options.trigger,
    cursor: options.cursor,
  };

  const taskQueue = getTaskQueueForConnector(options.connectorType);

  try {
    const handle = await client.workflow.start("connectorSyncWorkflow", {
      taskQueue,
      workflowId,
      args: [input],
      workflowTaskTimeout: "60s",
      memo: {
        trigger: options.trigger,
        connectorType: options.connectorType,
      },
    });

    return {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId,
    };
  } catch (error) {
    if (error instanceof WorkflowExecutionAlreadyStartedError) {
      return {
        workflowId,
        runId: "",
      };
    }
    throw error;
  }
}

export async function getSyncProgress(
  workflowId: string
): Promise<SyncProgress | null> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    const state = await handle.query(progressQuery);

    return {
      ...state,
      workflowId,
    };
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return null;
    }
    throw error;
  }
}

export async function pauseSync(workflowId: string): Promise<boolean> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(pauseSignal);
    return true;
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return false;
    }
    throw error;
  }
}

export async function resumeSync(workflowId: string): Promise<boolean> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(resumeSignal);
    return true;
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return false;
    }
    throw error;
  }
}

export async function cancelSync(workflowId: string): Promise<boolean> {
  const client = await getTemporalClient();

  try {
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(cancelSignal);
    return true;
  } catch (error) {
    if (error instanceof WorkflowNotFoundError) {
      return false;
    }
    throw error;
  }
}

export async function awaitSyncCompletion(
  workflowId: string
): Promise<ConnectorSyncOutput | null> {
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

export async function getActiveSyncsForConnector(
  connectorId: string
): Promise<SyncHandle[]> {
  const client = await getTemporalClient();

  const prefix = `sync:${connectorId}`;

  const workflows = client.workflow.list({
    query: `WorkflowId STARTS_WITH "${prefix}" AND ExecutionStatus = "Running"`,
  });

  const handles: SyncHandle[] = [];
  for await (const workflow of workflows) {
    handles.push({
      workflowId: workflow.workflowId,
      runId: workflow.runId,
    });
  }

  return handles;
}

export async function cancelAllSyncsForConnector(
  connectorId: string
): Promise<number> {
  const activeSyncs = await getActiveSyncsForConnector(connectorId);

  let cancelled = 0;
  for (const sync of activeSyncs) {
    const success = await cancelSync(sync.workflowId);
    if (success) {
      cancelled += 1;
    }
  }

  return cancelled;
}
