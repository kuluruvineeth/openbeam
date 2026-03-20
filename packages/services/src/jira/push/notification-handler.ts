import { timingSafeEqual } from "node:crypto";
import {
  type JiraWebhookPayload,
  JiraWebhookPayloadSchema,
} from "@openbeam/types/services/connectors/jira";
import { logger } from "../../lib/logger";

export type JiraDocumentChange = {
  action: "delete";
  documentId: string;
  externalId: string;
  documentType: string;
};

export type JiraWebhookResult = {
  processed: boolean;
  changes: JiraDocumentChange[];
};

export function verifyWebhookToken(
  pathToken: string,
  storedSecret: string
): boolean {
  if (pathToken.length !== storedSecret.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(pathToken), Buffer.from(storedSecret));
}

export function parseJiraWebhookPayload(body: string): JiraWebhookPayload {
  const parsed = JSON.parse(body);
  return JiraWebhookPayloadSchema.parse(parsed);
}

export function handleJiraWebhookEvent(
  payload: JiraWebhookPayload,
  connectorId: string
): JiraWebhookResult {
  if (payload.webhookEvent !== "jira:issue_deleted") {
    logger.debug(
      { event: payload.webhookEvent, connectorId },
      "Ignoring non-deletion Jira webhook event"
    );
    return { processed: false, changes: [] };
  }

  const issueId = payload.issue.id;
  const issueKey = payload.issue.key;

  logger.info(
    { connectorId, issueId, issueKey },
    "Processing Jira issue deletion webhook"
  );

  return {
    processed: true,
    changes: [
      {
        action: "delete",
        documentId: `${connectorId}_issue_${issueId}`,
        externalId: issueId,
        documentType: "issue",
      },
    ],
  };
}
