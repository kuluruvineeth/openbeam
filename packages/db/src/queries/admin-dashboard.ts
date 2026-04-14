import type { Database } from "../index";

export interface DashboardMetrics {
  connectorCount: number;
  activeConnectorCount: number;
  documentCount: number;
  memberCount: number;
  entityCount: number;
}

export async function getDashboardMetrics(
  db: Database,
  teamId: string
): Promise<DashboardMetrics> {
  const [connectors, members, entityCount] = await Promise.all([
    db.connector.findMany({
      where: { teamId },
      select: { id: true, status: true },
    }),
    db.usersOnTeam.count({ where: { teamId } }),
    db.entity.count({ where: { teamId } }),
  ]);

  const activeConnectorCount = connectors.filter(
    (c) => c.status === "ACTIVE"
  ).length;

  const connectorIds = connectors.map((c) => c.id);
  const documentCount =
    connectorIds.length > 0
      ? await db.indexedDocument.count({
          where: { connectorId: { in: connectorIds } },
        })
      : 0;

  return {
    connectorCount: connectors.length,
    activeConnectorCount,
    documentCount,
    memberCount: members,
    entityCount,
  };
}

export async function listAuditLogs(
  db: Database,
  teamId: string,
  options: {
    cursor?: string;
    limit?: number;
    category?: string;
    userId?: string;
  }
) {
  const limit = options.limit ?? 20;

  const logs = await db.auditLog.findMany({
    where: {
      teamId,
      ...(options.category && { category: options.category }),
      ...(options.userId && { userId: options.userId }),
    },
    include: { user: { select: { name: true, email: true } } },
    take: limit + 1,
    ...(options.cursor && { cursor: { id: options.cursor }, skip: 1 }),
    orderBy: { createdAt: "desc" },
  });

  const hasMore = logs.length > limit;
  const items = hasMore ? logs.slice(0, -1) : logs;
  const nextCursor = hasMore ? items.at(-1)?.id : undefined;

  return { items, nextCursor, hasMore };
}
