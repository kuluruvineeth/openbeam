import crypto from "node:crypto";
import {
  type GitHubWebhookPayload,
  GitHubWebhookPayloadSchema,
} from "@openbeam/types/services/connectors/github";
import { logger } from "../../lib/logger";

export interface GitHubWebhookRequest {
  headers: {
    "x-hub-signature-256"?: string;
    "x-github-delivery"?: string;
    "x-github-event"?: string;
  };
  body: string;
}

export interface VerifyResult {
  valid: boolean;
  error?: string;
}

export interface GitHubDocumentChange {
  action: "upsert" | "delete";
  entityType: string;
  entityId: string | number;
  repoFullName?: string;
}

export interface GitHubNotificationResult {
  changes: GitHubDocumentChange[];
  eventType: string;
  action: string;
  error?: string;
}

const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000;

export function verifyGitHubWebhookSignature(
  request: GitHubWebhookRequest,
  secret: string
): VerifyResult {
  const signature = request.headers["x-hub-signature-256"];

  if (!signature) {
    return { valid: false, error: "Missing X-Hub-Signature-256 header" };
  }

  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(request.body)
    .digest("hex")}`;

  if (signature.length !== expectedSignature.length) {
    return { valid: false, error: "Invalid signature" };
  }

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    return { valid: false, error: "Invalid signature" };
  }

  return { valid: true };
}

export function parseGitHubWebhookPayload(body: string): GitHubWebhookPayload {
  const json = JSON.parse(body);
  return GitHubWebhookPayloadSchema.parse(json);
}

export function isGitHubTimestampValid(timestampMs: number): boolean {
  const age = Date.now() - timestampMs;
  return age >= 0 && age <= MAX_TIMESTAMP_AGE_MS;
}

function extractEntityId(
  eventType: string,
  payload: GitHubWebhookPayload
): string | number | undefined {
  const raw = payload as Record<string, unknown>;

  switch (eventType) {
    case "issues": {
      const issue = raw.issue as { id?: number } | undefined;
      return issue?.id;
    }
    case "pull_request": {
      const pr = raw.pull_request as { id?: number } | undefined;
      return pr?.id;
    }
    case "discussion": {
      const discussion = raw.discussion as { node_id?: string } | undefined;
      return discussion?.node_id;
    }
    case "push": {
      const headCommit = raw.head_commit as { id?: string } | undefined;
      return headCommit?.id;
    }
    default:
      return;
  }
}

export function resolveGitHubWebhookChanges(
  eventType: string,
  payload: GitHubWebhookPayload
): GitHubNotificationResult {
  const { action } = payload;
  const repoFullName = payload.repository?.full_name;
  const changes: GitHubDocumentChange[] = [];

  const entityId = extractEntityId(eventType, payload);
  if (!entityId) {
    logger.debug({ eventType, action }, "No entity ID in GitHub webhook");
    return { changes, eventType, action };
  }

  const isDelete = action === "deleted" || action === "closed";
  const entityTypeMap: Record<string, string> = {
    issues: "issue",
    pull_request: "pull_request",
    discussion: "discussion",
    push: "commit",
  };

  const entityType = entityTypeMap[eventType];
  if (!entityType) {
    logger.debug({ eventType }, "Unhandled GitHub webhook event type");
    return { changes, eventType, action };
  }

  changes.push({
    action: isDelete ? "delete" : "upsert",
    entityType,
    entityId,
    repoFullName,
  });

  return { changes, eventType, action };
}
