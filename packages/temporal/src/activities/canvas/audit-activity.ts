import type { Database } from "@openplane/db";
import {
  logAgentAuditEvent,
  logAgentAuditEventBatch,
  logWorkflowEvent,
} from "../../audit/logger";
import {
  type AgentAuditAction,
  type AgentAuditEvent,
  AgentAuditEventSchema,
  type LogAuditEventInput,
  LogAuditEventInputSchema,
  type WorkflowAuditAction,
} from "../../audit/types";

const SENSITIVE_METADATA_FIELDS = new Set([
  "accessToken",
  "refreshToken",
  "apiKey",
  "apiKeyValue",
  "password",
  "secret",
  "credentials",
  "token",
  "privateKey",
  "clientSecret",
  "bearerToken",
  "authToken",
  "sessionToken",
  "oauthToken",
  "encryptionKey",
  "signingKey",
  "webhookSecret",
]);

const REDACTED = "[REDACTED]";

function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!metadata) {
    return metadata;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_METADATA_FIELDS.has(key)) {
      sanitized[key] = REDACTED;
    } else if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export interface AuditActivityDependencies {
  db: Database;
}

export function createLogAuditEventActivity(deps: AuditActivityDependencies) {
  return async function logAuditEvent(
    rawInput: LogAuditEventInput
  ): Promise<void> {
    const input = LogAuditEventInputSchema.parse(rawInput);

    await logWorkflowEvent(deps.db, {
      timestamp: Date.now(),
      workflowId: input.workflowId,
      runId: input.runId,
      teamId: input.teamId,
      userId: input.userId,
      action: input.action as WorkflowAuditAction,
      metadata: sanitizeMetadata(input.metadata),
    });
  };
}

export interface LogAgentAuditEventInput {
  workflowId: string;
  runId?: string;
  teamId: string;
  executionId: string;
  stepId?: string;
  nodeId?: string;
  action: AgentAuditAction;
  actor: string;
  metadata?: Record<string, unknown>;
}

function createLogAgentAuditEventActivity(deps: AuditActivityDependencies) {
  return async function logAgentAuditEventActivity(
    rawInput: LogAgentAuditEventInput
  ): Promise<void> {
    const input = AgentAuditEventSchema.parse({
      ...rawInput,
      timestamp: Date.now(),
    });

    await logAgentAuditEvent(deps.db, {
      ...input,
      metadata: sanitizeMetadata(input.metadata),
    });
  };
}

function createLogAgentAuditEventBatchActivity(
  deps: AuditActivityDependencies
) {
  return function logAgentAuditEventBatchActivity(
    rawInputs: LogAgentAuditEventInput[]
  ): Promise<{ count: number }> {
    const events: AgentAuditEvent[] = rawInputs.map((input) =>
      AgentAuditEventSchema.parse({
        ...input,
        timestamp: Date.now(),
        metadata: sanitizeMetadata(input.metadata),
      })
    );

    return logAgentAuditEventBatch(deps.db, events);
  };
}

export type AuditActivities = {
  logAuditEvent: (input: LogAuditEventInput) => Promise<void>;
  logAgentAuditEvent: (input: LogAgentAuditEventInput) => Promise<void>;
  logAgentAuditEventBatch: (
    inputs: LogAgentAuditEventInput[]
  ) => Promise<{ count: number }>;
};

export function createAuditActivities(
  deps: AuditActivityDependencies
): AuditActivities {
  return {
    logAuditEvent: createLogAuditEventActivity(deps),
    logAgentAuditEvent: createLogAgentAuditEventActivity(deps),
    logAgentAuditEventBatch: createLogAgentAuditEventBatchActivity(deps),
  };
}

export { sanitizeMetadata, SENSITIVE_METADATA_FIELDS };
