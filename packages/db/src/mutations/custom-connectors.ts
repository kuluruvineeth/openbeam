import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

export interface CreateCustomConnectorInput {
  teamId: string;
  connectorId: string;
  slug: string;
  name: string;
  description?: string;
  iconUrl?: string;
  fieldMappings?: Record<string, string>;
  defaultDocumentType?: string;
  defaultIsPublic?: boolean;
}

export function createCustomConnectorDefinition(
  db: Database,
  input: CreateCustomConnectorInput
) {
  return db.customConnectorDefinition.create({
    data: {
      teamId: input.teamId,
      connectorId: input.connectorId,
      slug: input.slug,
      name: input.name,
      description: input.description,
      iconUrl: input.iconUrl,
      fieldMappings: input.fieldMappings ?? {},
      defaultDocumentType: input.defaultDocumentType ?? "custom_document",
      defaultIsPublic: input.defaultIsPublic ?? false,
    },
    include: { connector: true },
  });
}

export interface UpdateCustomConnectorInput {
  name?: string;
  description?: string;
  iconUrl?: string;
  fieldMappings?: Record<string, string>;
  defaultDocumentType?: string;
  defaultIsPublic?: boolean;
}

export function updateCustomConnectorDefinition(
  db: Database,
  id: string,
  input: UpdateCustomConnectorInput
) {
  return db.customConnectorDefinition.update({
    where: { id },
    data: input,
    include: { connector: true },
  });
}

export function deleteCustomConnectorDefinition(db: Database, id: string) {
  return db.customConnectorDefinition.delete({
    where: { id },
  });
}

export function incrementCustomConnectorStats(
  db: Database,
  id: string,
  documentsDelta: number
) {
  return db.customConnectorDefinition.update({
    where: { id },
    data: {
      totalDocuments: { increment: documentsDelta },
      totalPushes: { increment: 1 },
      lastPushAt: new Date(),
    },
  });
}

export function decrementCustomConnectorDocuments(
  db: Database,
  id: string,
  count: number
) {
  return db.customConnectorDefinition.update({
    where: { id },
    data: {
      totalDocuments: { decrement: count },
    },
  });
}

export interface CreateWebhookEventInput {
  definitionId: string;
  eventId: string;
  eventType?: string;
  action: string;
  status?: string;
  rawPayloadHash?: string;
  payloadSize?: number;
}

export function createWebhookEvent(
  db: Database,
  input: CreateWebhookEventInput
) {
  return db.webhookEvent.create({
    data: {
      definitionId: input.definitionId,
      eventId: input.eventId,
      eventType: input.eventType,
      action: input.action,
      status: input.status ?? "received",
      rawPayloadHash: input.rawPayloadHash,
      payloadSize: input.payloadSize,
    },
  });
}

export function markWebhookEventCompleted(
  db: Database,
  id: string,
  documentIds: string[],
  processingMs: number
) {
  return db.webhookEvent.update({
    where: { id },
    data: {
      status: "completed",
      documentIds,
      processingMs,
      processedAt: new Date(),
    },
  });
}

export function markWebhookEventFailed(
  db: Database,
  id: string,
  statusMessage: string
) {
  return db.webhookEvent.update({
    where: { id },
    data: {
      status: "failed",
      statusMessage,
      processedAt: new Date(),
    },
  });
}

export function incrementWebhookStats(
  db: Database,
  definitionId: string,
  success: boolean
) {
  return db.customConnectorDefinition.update({
    where: { id: definitionId },
    data: {
      totalWebhookEvents: { increment: 1 },
      lastWebhookReceivedAt: new Date(),
      consecutiveErrors: success ? 0 : { increment: 1 },
    },
  });
}

export function updateWebhookConfig(
  db: Database,
  id: string,
  webhookConfig: Record<string, unknown>,
  webhookEnabled: boolean
) {
  return db.customConnectorDefinition.update({
    where: { id },
    data: {
      webhookConfig: webhookConfig as Prisma.InputJsonValue,
      webhookEnabled,
    },
    include: { connector: true },
  });
}

export interface UpdatePullConfigInput {
  pullConfig: Record<string, unknown>;
  pullEnabled: boolean;
  pullScheduleCron?: string;
}

export function updatePullConfig(
  db: Database,
  id: string,
  input: UpdatePullConfigInput
) {
  return db.customConnectorDefinition.update({
    where: { id },
    data: {
      pullConfig: input.pullConfig as Prisma.InputJsonValue,
      pullEnabled: input.pullEnabled,
      pullScheduleCron: input.pullScheduleCron ?? null,
    },
    include: { connector: true },
  });
}

export function updateLastPullSyncAt(db: Database, id: string) {
  return db.customConnectorDefinition.update({
    where: { id },
    data: { lastPullSyncAt: new Date() },
  });
}

export interface CreateCustomConnectorApiKeyInput {
  definitionId: string;
  name: string;
  keyHash: string;
  prefix: string;
  scopes?: string[];
  expiresAt?: Date;
}

export function createCustomConnectorApiKey(
  db: Database,
  input: CreateCustomConnectorApiKeyInput
) {
  return db.customConnectorApiKey.create({
    data: {
      definitionId: input.definitionId,
      name: input.name,
      keyHash: input.keyHash,
      prefix: input.prefix,
      scopes:
        input.scopes && input.scopes.length > 0
          ? input.scopes
          : ["push", "delete", "status"],
      expiresAt: input.expiresAt,
    },
  });
}

export function revokeCustomConnectorApiKey(
  db: Database,
  id: string,
  definitionId: string
) {
  return db.customConnectorApiKey.updateMany({
    where: { id, definitionId, revoked: false },
    data: { revoked: true },
  });
}

export function touchCustomConnectorApiKey(db: Database, id: string) {
  return db.customConnectorApiKey.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });
}
