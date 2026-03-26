import type { Database } from "../index";

export function getCustomConnectorBySlug(
  db: Database,
  teamId: string,
  slug: string
) {
  return db.customConnectorDefinition.findUnique({
    where: { teamId_slug: { teamId, slug } },
    include: { connector: true },
  });
}

export function getCustomConnectorById(db: Database, id: string) {
  return db.customConnectorDefinition.findUnique({
    where: { id },
    include: { connector: true },
  });
}

export function getCustomConnectorByConnectorId(
  db: Database,
  connectorId: string
) {
  return db.customConnectorDefinition.findUnique({
    where: { connectorId },
    include: { connector: true },
  });
}

export function listCustomConnectors(db: Database, teamId: string) {
  return db.customConnectorDefinition.findMany({
    where: { teamId },
    include: { connector: { select: { status: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function getCustomConnectorApiKeyByPrefix(db: Database, prefix: string) {
  return db.customConnectorApiKey.findMany({
    where: { prefix, revoked: false },
    include: {
      definition: {
        include: { connector: true },
      },
    },
  });
}

export function getCustomConnectorBySlugGlobal(db: Database, slug: string) {
  return db.customConnectorDefinition.findFirst({
    where: { slug },
    include: { connector: true },
  });
}

export function listWebhookEvents(
  db: Database,
  definitionId: string,
  options?: { status?: string; limit?: number; cursor?: string }
) {
  return db.webhookEvent.findMany({
    where: {
      definitionId,
      ...(options?.status ? { status: options.status } : {}),
    },
    orderBy: { receivedAt: "desc" },
    take: options?.limit ?? 50,
    ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });
}

export function listCustomConnectorApiKeys(db: Database, definitionId: string) {
  return db.customConnectorApiKey.findMany({
    where: { definitionId },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      revoked: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export function listSyncRuns(
  db: Database,
  definitionId: string,
  options?: { limit?: number; offset?: number }
) {
  return db.customConnectorSyncRun.findMany({
    where: { definitionId },
    orderBy: { startedAt: "desc" },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
  });
}

export function countSyncRuns(db: Database, definitionId: string) {
  return db.customConnectorSyncRun.count({
    where: { definitionId },
  });
}

export function getRecentSyncRuns(
  db: Database,
  definitionId: string,
  since: Date
) {
  return db.customConnectorSyncRun.findMany({
    where: { definitionId, startedAt: { gte: since } },
    orderBy: { startedAt: "desc" },
  });
}

export function getMetricsBetween(
  db: Database,
  definitionId: string,
  startDate: Date,
  endDate: Date
) {
  return db.customConnectorMetrics.findMany({
    where: {
      definitionId,
      periodStart: { gte: startDate },
      periodEnd: { lte: endDate },
    },
    orderBy: { periodStart: "asc" },
  });
}

export function getLatestHealthSnapshot(db: Database, definitionId: string) {
  return db.customConnectorHealthSnapshot.findFirst({
    where: { definitionId },
    orderBy: { capturedAt: "desc" },
  });
}
