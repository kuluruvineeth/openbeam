import type { Database } from "@openplane/db";
import type { AgentResourceServices } from "./agent-resources";

export interface CreateAgentResourceServicesOptions {
  db: Database;
}

export function createAgentResourceServices(
  options: CreateAgentResourceServicesOptions
): AgentResourceServices {
  const { db } = options;

  return {
    async getConnectors(teamId: string) {
      const connectors = await db.connector.findMany({
        where: { teamId },
        select: {
          id: true,
          name: true,
          app: true,
          status: true,
          lastSyncedAt: true,
          _count: {
            select: { indexedDocuments: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return connectors.map((c) => ({
        id: c.id,
        name: c.name ?? c.app,
        type: c.app,
        status: c.status.toLowerCase(),
        documentCount: c._count.indexedDocuments,
        lastSyncAt: c.lastSyncedAt,
      }));
    },

    async getRecentDocuments(teamId: string, hours: number) {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

      const documents = await db.indexedDocument.findMany({
        where: {
          connector: { teamId },
          lastSyncedAt: { gte: cutoff },
        },
        select: {
          id: true,
          title: true,
          connector: { select: { app: true } },
          lastSyncedAt: true,
        },
        orderBy: { lastSyncedAt: "desc" },
        take: 100,
      });

      return documents.map((d) => ({
        id: d.id,
        title: d.title ?? "Untitled",
        sourceType: d.connector.app,
        updatedAt: d.lastSyncedAt ?? new Date(),
      }));
    },

    async getTeamProfile(teamId: string) {
      const team = await db.team.findUnique({
        where: { id: teamId },
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: {
            select: { usersOnTeam: true },
          },
        },
      });

      if (!team) {
        throw new Error(`Team not found: ${teamId}`);
      }

      return {
        id: team.id,
        name: team.name,
        createdAt: team.createdAt,
        memberCount: team._count.usersOnTeam,
        settings: {},
      };
    },

    async getUserContext(teamId: string, userId: string) {
      const [user, membership, permissions] = await Promise.all([
        db.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
          },
        }),
        db.usersOnTeam.findUnique({
          where: { userId_teamId: { userId, teamId } },
          select: { role: true },
        }),
        db.connectorScope.findMany({
          where: { userId, teamId },
          select: { resourceScopes: true, isFullAccess: true },
        }),
      ]);

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      const permissionList: string[] = ["read"];
      if (membership?.role === "ADMIN" || membership?.role === "OWNER") {
        permissionList.push("write", "admin");
      } else if (membership?.role === "MEMBER") {
        permissionList.push("write");
      }

      for (const scope of permissions) {
        if (scope.isFullAccess) {
          permissionList.push("full_access");
        }
        permissionList.push(...scope.resourceScopes);
      }

      const uniquePermissions = [...new Set(permissionList)];

      return {
        id: user.id,
        name: user.name ?? "Unknown User",
        email: user.email ?? "",
        role: membership?.role ?? "GUEST",
        preferences: {},
        permissions: uniquePermissions,
      };
    },

    async getTeamStats(teamId: string) {
      const [connectorStats, documentCount, searchStats] = await Promise.all([
        db.connector.groupBy({
          by: ["status"],
          where: { teamId },
          _count: { id: true },
        }),
        db.indexedDocument.count({
          where: { connector: { teamId } },
        }),
        db.userSearchProfile.aggregate({
          where: { teamId },
          _sum: { searchCount: true },
          _avg: { avgDwellMs: true },
        }),
      ]);

      const connectorCount = connectorStats.reduce(
        (sum, s) => sum + s._count.id,
        0
      );
      const activeConnectors =
        connectorStats.find((s) => s.status === "ACTIVE")?._count.id ?? 0;

      const lastSync = await db.connector.findFirst({
        where: { teamId, lastSyncedAt: { not: null } },
        orderBy: { lastSyncedAt: "desc" },
        select: { lastSyncedAt: true },
      });

      return {
        documentCount,
        connectorCount,
        activeConnectors,
        lastSyncAt: lastSync?.lastSyncedAt ?? null,
        searchesLast24h: searchStats._sum.searchCount ?? 0,
        avgSearchLatencyMs: Math.round(searchStats._avg.avgDwellMs ?? 0),
      };
    },

    async getMemoryStats(teamId: string) {
      const [compositionCount, feedbackCount, traceCount] = await Promise.all([
        db.compositionEvent.count({ where: { teamId } }),
        db.userFeedback.count({ where: { teamId } }),
        db.agentExecutionTrace.count({ where: { teamId } }),
      ]);

      return {
        episodic: compositionCount,
        semantic: traceCount,
        procedural: feedbackCount,
        total: compositionCount + traceCount + feedbackCount,
      };
    },

    async getDocument(documentId: string, teamId: string) {
      const document = await db.indexedDocument.findFirst({
        where: {
          id: documentId,
          connector: { teamId },
        },
        select: {
          id: true,
          title: true,
          externalId: true,
          vespaId: true,
          documentType: true,
          sourceId: true,
          sourcePath: true,
          createdAt: true,
          lastSyncedAt: true,
          createdAtSource: true,
          updatedAtSource: true,
          metadata: true,
          connector: { select: { app: true } },
        },
      });

      if (!document) {
        return null;
      }

      return {
        id: document.id,
        title: document.title ?? "Untitled",
        content: "",
        sourceType: document.connector.app,
        sourceId: document.sourceId ?? document.externalId,
        url: document.sourcePath,
        createdAt: document.createdAtSource ?? document.createdAt,
        updatedAt:
          document.updatedAtSource ??
          document.lastSyncedAt ??
          document.createdAt,
        metadata: (document.metadata as Record<string, unknown>) ?? {},
      };
    },

    async getSearchResults(queryId: string, teamId: string) {
      const searchImpression = await db.searchImpression.findFirst({
        where: {
          id: queryId,
          teamId,
        },
        select: {
          id: true,
          query: true,
          createdAt: true,
          resultDocIds: true,
        },
      });

      if (!searchImpression) {
        return null;
      }

      const results = searchImpression.resultDocIds.map((docId, index) => ({
        id: docId,
        title: `Document ${index + 1}`,
        snippet: "",
        score: 1 - index * 0.1,
        sourceType: "unknown",
      }));

      return {
        query: searchImpression.query,
        results,
        totalCount: results.length,
        executedAt: searchImpression.createdAt,
      };
    },

    async getConnectorDetails(connectorId: string, teamId: string) {
      const connector = await db.connector.findFirst({
        where: {
          id: connectorId,
          teamId,
        },
        select: {
          id: true,
          name: true,
          app: true,
          status: true,
          lastSyncedAt: true,
          createdAt: true,
          config: true,
          _count: {
            select: { indexedDocuments: true },
          },
        },
      });

      if (!connector) {
        return null;
      }

      const errorCount = await db.syncHistory.count({
        where: {
          connectorId,
          status: "FAILED",
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });

      return {
        id: connector.id,
        name: connector.name ?? connector.app,
        type: connector.app,
        status: connector.status.toLowerCase(),
        documentCount: connector._count.indexedDocuments,
        lastSyncAt: connector.lastSyncedAt,
        createdAt: connector.createdAt,
        configuration: (connector.config as Record<string, unknown>) ?? {},
        syncSchedule: null,
        errorCount,
      };
    },

    async getConnectorHistory(connectorId: string, teamId: string, limit = 20) {
      const connector = await db.connector.findFirst({
        where: { id: connectorId, teamId },
        select: { id: true },
      });

      if (!connector) {
        return [];
      }

      const history = await db.syncHistory.findMany({
        where: { connectorId },
        orderBy: { startedAt: "desc" },
        take: limit,
        select: {
          id: true,
          status: true,
          startedAt: true,
          finishedAt: true,
          dataAdded: true,
          dataUpdated: true,
          dataDeleted: true,
          dataSkipped: true,
          dataFailed: true,
          errorMessage: true,
        },
      });

      return history.map((h) => ({
        id: h.id,
        status: h.status.toLowerCase(),
        startedAt: h.startedAt,
        completedAt: h.finishedAt,
        documentsProcessed: h.dataAdded + h.dataUpdated + h.dataDeleted,
        documentsAdded: h.dataAdded,
        documentsUpdated: h.dataUpdated,
        documentsDeleted: h.dataDeleted,
        errorMessage: h.errorMessage,
      }));
    },
  };
}
