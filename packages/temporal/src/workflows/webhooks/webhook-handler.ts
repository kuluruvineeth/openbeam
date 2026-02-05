import {
  WebhookInputSchema,
  type WebhookOutput,
} from "@openplane/types/temporal/workflows";
import { executeChild, proxyActivities } from "@temporalio/workflow";
import type { WebhookActivities } from "../../activities/webhooks/types";
import { connectorSyncWorkflow } from "../sync/connector-sync";

const webhookActivities = proxyActivities<WebhookActivities>({
  startToCloseTimeout: "30s",
  scheduleToCloseTimeout: "3m",
  retry: { maximumAttempts: 5 },
});

export async function webhookHandlerWorkflow(
  rawInput: unknown
): Promise<WebhookOutput> {
  const input = WebhookInputSchema.parse(rawInput);
  const verified = await webhookActivities.verifySignature({
    payload: input.payload,
    signature: input.signature,
    connectorType: input.connectorType,
    connectorId: input.connectorId,
  });

  if (!verified.valid) {
    return {
      processed: false,
      success: false,
      error: verified.reason ?? "Signature verification failed",
    };
  }

  const connector = await webhookActivities.loadConnector(input.connectorId);

  const eventResult = await webhookActivities.processWebhookEvent({
    connectorType: connector.type,
    eventType: input.eventType,
    payload: input.payload,
  });

  if (eventResult.action === "revoke_auth") {
    await webhookActivities.revokeConnector({
      connectorId: input.connectorId,
      reason: "OAuth token revoked via webhook",
    });

    return {
      eventId: input.eventId,
      action: eventResult.action,
      processed: true,
      success: true,
    };
  }

  if (eventResult.action === "sync_document") {
    const syncHistoryId = `sync:${input.connectorId}:webhook:${input.eventId}`;
    await executeChild(connectorSyncWorkflow, {
      args: [
        {
          connectorId: input.connectorId,
          syncHistoryId,
          syncType: "INCREMENTAL",
          trigger: "WEBHOOK",
          cursor: { documentIds: eventResult.documentIds },
        },
      ],
      workflowId: syncHistoryId,
    });
  }

  if (eventResult.action === "delete_document") {
    await webhookActivities.deleteDocuments({
      connectorId: input.connectorId,
      documentIds: eventResult.documentIds,
    });
  }

  return {
    eventId: input.eventId,
    action: eventResult.action,
    processed: true,
    success: true,
  };
}
