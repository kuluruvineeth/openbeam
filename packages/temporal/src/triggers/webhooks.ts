import { WorkflowNotFoundError } from "@temporalio/client";
import { getTemporalClient } from "../client";
import { TASK_QUEUES } from "../config/task-queues";
import { generateWorkflowId } from "../utils/workflow-id";
import type { WebhookInput, WebhookOutput } from "../workflows/types";

export interface ProcessWebhookOptions {
  connectorId: string;
  connectorType: string;
  eventId: string;
  eventType: string;
  payload: unknown;
  signature: string;
  receivedAt?: number;
}

export interface WebhookHandle {
  workflowId: string;
  runId: string;
}

export async function processWebhook(
  options: ProcessWebhookOptions
): Promise<WebhookHandle> {
  const client = await getTemporalClient();

  const workflowId = generateWorkflowId({
    type: "webhook",
    connectorId: options.connectorId,
  });

  const input: WebhookInput = {
    connectorId: options.connectorId,
    connectorType: options.connectorType,
    eventId: options.eventId,
    eventType: options.eventType,
    payload: options.payload,
    signature: options.signature,
    receivedAt: options.receivedAt ?? Date.now(),
  };

  const handle = await client.workflow.start("webhookHandlerWorkflow", {
    taskQueue: TASK_QUEUES.WEBHOOKS,
    workflowId,
    args: [input],
    memo: {
      eventId: options.eventId,
      eventType: options.eventType,
      connectorType: options.connectorType,
    },
  });

  return {
    workflowId: handle.workflowId,
    runId: handle.firstExecutionRunId,
  };
}

export async function awaitWebhookResult(
  workflowId: string
): Promise<WebhookOutput | null> {
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

export async function processWebhookSync(
  options: ProcessWebhookOptions
): Promise<WebhookOutput> {
  const handle = await processWebhook(options);
  const result = await awaitWebhookResult(handle.workflowId);

  if (!result) {
    throw new Error(`Webhook workflow ${handle.workflowId} not found`);
  }

  return result;
}
