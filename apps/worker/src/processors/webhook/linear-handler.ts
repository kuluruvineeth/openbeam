import prisma, {
  createWebhookProcessedLog,
  getConnectorForSync,
  updateConnector,
} from "@openplane/db";
import type { WebhookJobData } from "@openplane/redis";
import { addSyncJob } from "@openplane/redis";
import logger from "../../utils/logger";

type WebhookOperation = "create" | "update" | "delete" | "skip";

export interface LinearWebhookResult {
  processed: boolean;
  operation?: WebhookOperation;
  documentId?: string;
  reason?: string;
}

interface LinearWebhookPayload {
  action?: string;
  type?: string;
  data?: Record<string, unknown>;
}

export async function processLinearWebhook(
  data: WebhookJobData
): Promise<LinearWebhookResult> {
  const { connectorId, eventId, eventType, payload } = data;

  logger.debug(
    { connectorId, eventId, eventType },
    "Processing Linear webhook event"
  );

  const connector = await getConnectorForSync(prisma, connectorId);
  if (!connector) {
    logger.warn({ connectorId, eventId }, "Connector not found");
    return { processed: false, reason: "connector_not_found" };
  }

  if (connector.status !== "ACTIVE") {
    logger.warn(
      { connectorId, eventId, status: connector.status },
      "Connector not active"
    );
    return { processed: false, reason: "connector_inactive" };
  }

  const webhookPayload = payload as LinearWebhookPayload;

  const syncJob = await addSyncJob({
    connectorId,
    syncJobId: "",
    type: "INCREMENTAL",
    trigger: "WEBHOOK",
    priority: 2,
  });

  logger.info(
    {
      connectorId,
      eventId,
      syncJobId: syncJob.id,
      action: webhookPayload.action,
      type: webhookPayload.type,
    },
    "Linear webhook triggered incremental sync"
  );

  await createWebhookProcessedLog(prisma, {
    connectorId,
    userId: connector.userId,
    eventId,
    eventType,
    operations: [
      {
        operation: "skip" as WebhookOperation,
        documentId: `sync:${syncJob.id}`,
        success: true,
      },
    ],
  });

  await updateConnector(prisma, connectorId, {
    webhookConfig: {
      enabled: true,
      lastReceivedAt: new Date().toISOString(),
    },
  });

  return {
    processed: true,
    operation: "skip",
    reason: "triggered_incremental_sync",
  };
}

export function shouldProcessLinearRealtime(_eventType: string): boolean {
  return true;
}
