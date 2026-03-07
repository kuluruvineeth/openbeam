import crypto from "node:crypto";
import {
  type LinearComment,
  type LinearTransformContext,
  type LinearWebhookPayload,
  LinearWebhookPayloadSchema,
} from "@openbeam/types/services/connectors/linear";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { getDocument } from "../api/documents";
import { getIssue, getIssueComments } from "../api/issues";
import { getProject } from "../api/projects";
import type { LinearClient } from "../client";
import { transformDocument } from "../transformers/document";
import { transformIssue } from "../transformers/issue";
import { transformProject } from "../transformers/project";

export interface WebhookRequest {
  headers: {
    "linear-signature"?: string;
    "linear-delivery"?: string;
    "linear-event"?: string;
  };
  body: string;
}

export interface VerifyResult {
  valid: boolean;
  error?: string;
}

export interface DocumentChange {
  action: "upsert" | "delete";
  document?: GenericDocument;
  documentId?: string;
}

export interface NotificationResult {
  changes: DocumentChange[];
  eventType: string;
  action: string;
  error?: string;
}

const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000;

export function verifyWebhookSignature(
  request: WebhookRequest,
  signingSecret: string
): VerifyResult {
  const signature = request.headers["linear-signature"];

  if (!signature) {
    return { valid: false, error: "Missing Linear-Signature header" };
  }

  const expectedSignature = crypto
    .createHmac("sha256", signingSecret)
    .update(request.body)
    .digest("hex");

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    return { valid: false, error: "Invalid signature" };
  }

  return { valid: true };
}

export function parseWebhookPayload(body: string): LinearWebhookPayload {
  const json = JSON.parse(body);
  return LinearWebhookPayloadSchema.parse(json);
}

export function isTimestampValid(webhookTimestamp: number): boolean {
  const now = Date.now();
  const age = now - webhookTimestamp;
  return age >= 0 && age <= MAX_TIMESTAMP_AGE_MS;
}

export async function handleWebhookNotification(
  client: LinearClient,
  context: LinearTransformContext,
  payload: LinearWebhookPayload
): Promise<NotificationResult> {
  const { action, type, data } = payload;
  const changes: DocumentChange[] = [];

  logger.info({ action, type }, "Processing Linear webhook");

  if (action === "remove") {
    const documentId = buildDocumentId(context.connectorId, type, data);
    if (documentId) {
      changes.push({ action: "delete", documentId });
    }
    return { changes, eventType: type, action };
  }

  try {
    switch (type) {
      case "Issue": {
        const issueId = typeof data.id === "string" ? data.id : undefined;
        if (!issueId) {
          logger.warn({ data }, "Invalid issue webhook - missing id");
          break;
        }

        const issue = await getIssue(client, issueId);
        const comments: LinearComment[] = [];
        const { comments: issueComments } = await getIssueComments(
          client,
          issueId
        );
        comments.push(...issueComments);

        const document = await transformIssue(issue, context, { comments });
        changes.push({ action: "upsert", document });
        break;
      }

      case "Project": {
        const projectId = typeof data.id === "string" ? data.id : undefined;
        if (!projectId) {
          logger.warn({ data }, "Invalid project webhook - missing id");
          break;
        }

        const project = await getProject(client, projectId);
        const document = await transformProject(project, context);
        changes.push({ action: "upsert", document });
        break;
      }

      case "Document": {
        const documentId = typeof data.id === "string" ? data.id : undefined;
        if (!documentId) {
          logger.warn({ data }, "Invalid document webhook - missing id");
          break;
        }

        const doc = await getDocument(client, documentId);
        const document = await transformDocument(doc, context);
        changes.push({ action: "upsert", document });
        break;
      }

      case "Comment": {
        const issueData = data.issue;
        const issueId =
          typeof issueData === "object" &&
          issueData !== null &&
          "id" in issueData &&
          typeof issueData.id === "string"
            ? issueData.id
            : undefined;
        if (!issueId) {
          logger.warn({ data }, "Invalid comment webhook - missing issue id");
          break;
        }

        const issue = await getIssue(client, issueId);
        const comments: LinearComment[] = [];
        const { comments: issueComments } = await getIssueComments(
          client,
          issueId
        );
        comments.push(...issueComments);

        const document = await transformIssue(issue, context, { comments });
        changes.push({ action: "upsert", document });
        break;
      }

      default:
        logger.debug({ type }, "Unhandled Linear webhook type");
    }
  } catch (error) {
    logger.error({ error, type, action }, "Error processing Linear webhook");
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { changes, eventType: type, action, error: errorMessage };
  }

  return { changes, eventType: type, action };
}

function buildDocumentId(
  connectorId: string,
  type: string,
  data: Record<string, unknown>
): string | undefined {
  const id = typeof data.id === "string" ? data.id : undefined;
  if (!id) {
    return;
  }

  switch (type) {
    case "Issue":
      return `${connectorId}_issue_${id}`;
    case "Project":
      return `${connectorId}_project_${id}`;
    case "Document":
      return `${connectorId}_document_${id}`;
    default:
      return;
  }
}
