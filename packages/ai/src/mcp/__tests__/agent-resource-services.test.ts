import { describe, expect, it, mock } from "bun:test";
import { createAgentResourceServices } from "../agent-resource-services";

function createMockDb() {
  return {
    connector: {
      findMany: mock(() => Promise.resolve([] as unknown[])),
      groupBy: mock(() => Promise.resolve([] as unknown[])),
      findFirst: mock(() => Promise.resolve(null as unknown)),
    },
    indexedDocument: {
      findMany: mock(() => Promise.resolve([] as unknown[])),
      count: mock(() => Promise.resolve(0)),
    },
    team: {
      findUnique: mock(() => Promise.resolve(null as unknown)),
    },
    user: {
      findUnique: mock(() => Promise.resolve(null as unknown)),
    },
    usersOnTeam: {
      findUnique: mock(() => Promise.resolve(null as unknown)),
    },
    connectorScope: {
      findMany: mock(() => Promise.resolve([] as unknown[])),
    },
    userSearchProfile: {
      aggregate: mock(() =>
        Promise.resolve({
          _sum: { searchCount: null as number | null },
          _avg: { avgDwellMs: null as number | null },
        })
      ),
    },
    compositionEvent: {
      count: mock(() => Promise.resolve(0)),
    },
    userFeedback: {
      count: mock(() => Promise.resolve(0)),
    },
    agentExecutionTrace: {
      count: mock(() => Promise.resolve(0)),
    },
  };
}

describe("createAgentResourceServices", () => {
  describe("getConnectors", () => {
    it("returns empty array when no connectors exist", async () => {
      const mockDb = createMockDb();
      const services = createAgentResourceServices({ db: mockDb as never });

      const result = await services.getConnectors("team_123");

      expect(result).toEqual([]);
      expect(mockDb.connector.findMany).toHaveBeenCalledWith({
        where: { teamId: "team_123" },
        select: {
          id: true,
          name: true,
          app: true,
          status: true,
          lastSyncedAt: true,
          _count: { select: { indexedDocuments: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("maps connector data correctly", async () => {
      const mockDb = createMockDb();
      const lastSync = new Date("2024-01-15T10:00:00Z");

      mockDb.connector.findMany = mock(() =>
        Promise.resolve([
          {
            id: "conn_1",
            name: "My Slack",
            app: "SLACK",
            status: "ACTIVE",
            lastSyncedAt: lastSync,
            _count: { indexedDocuments: 1500 },
          },
          {
            id: "conn_2",
            name: null,
            app: "NOTION",
            status: "SYNCING",
            lastSyncedAt: null,
            _count: { indexedDocuments: 850 },
          },
        ])
      );

      const services = createAgentResourceServices({ db: mockDb as never });
      const result = await services.getConnectors("team_123");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "conn_1",
        name: "My Slack",
        type: "SLACK",
        status: "active",
        documentCount: 1500,
        lastSyncAt: lastSync,
      });
      expect(result[1]).toEqual({
        id: "conn_2",
        name: "NOTION",
        type: "NOTION",
        status: "syncing",
        documentCount: 850,
        lastSyncAt: null,
      });
    });
  });

  describe("getRecentDocuments", () => {
    it("returns empty array when no recent documents", async () => {
      const mockDb = createMockDb();
      const services = createAgentResourceServices({ db: mockDb as never });

      const result = await services.getRecentDocuments("team_123", 24);

      expect(result).toEqual([]);
    });

    it("maps document data correctly", async () => {
      const mockDb = createMockDb();
      const updatedAt = new Date("2024-01-15T10:00:00Z");

      mockDb.indexedDocument.findMany = mock(() =>
        Promise.resolve([
          {
            id: "doc_1",
            title: "Q4 Planning",
            connector: { app: "NOTION" },
            lastSyncedAt: updatedAt,
          },
          {
            id: "doc_2",
            title: null,
            connector: { app: "SLACK" },
            lastSyncedAt: null,
          },
        ])
      );

      const services = createAgentResourceServices({ db: mockDb as never });
      const result = await services.getRecentDocuments("team_123", 24);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "doc_1",
        title: "Q4 Planning",
        sourceType: "NOTION",
        updatedAt,
      });
      expect(result[1]?.title).toBe("Untitled");
    });
  });

  describe("getTeamProfile", () => {
    it("throws error when team not found", async () => {
      const mockDb = createMockDb();
      const services = createAgentResourceServices({ db: mockDb as never });

      await expect(services.getTeamProfile("nonexistent")).rejects.toThrow(
        "Team not found: nonexistent"
      );
    });

    it("returns team profile with member count", async () => {
      const mockDb = createMockDb();
      const createdAt = new Date("2024-01-01T00:00:00Z");

      mockDb.team.findUnique = mock(() =>
        Promise.resolve({
          id: "team_123",
          name: "Engineering",
          createdAt,
          _count: { usersOnTeam: 12 },
        })
      );

      const services = createAgentResourceServices({ db: mockDb as never });
      const result = await services.getTeamProfile("team_123");

      expect(result).toEqual({
        id: "team_123",
        name: "Engineering",
        createdAt,
        memberCount: 12,
        settings: {},
      });
    });
  });

  describe("getUserContext", () => {
    it("throws error when user not found", async () => {
      const mockDb = createMockDb();
      const services = createAgentResourceServices({ db: mockDb as never });

      await expect(
        services.getUserContext("team_123", "nonexistent")
      ).rejects.toThrow("User not found: nonexistent");
    });

    it("returns user context with permissions", async () => {
      const mockDb = createMockDb();

      mockDb.user.findUnique = mock(() =>
        Promise.resolve({
          id: "user_1",
          name: "John Doe",
          email: "john@example.com",
        })
      );

      mockDb.usersOnTeam.findUnique = mock(() =>
        Promise.resolve({ role: "ADMIN" })
      );

      mockDb.connectorScope.findMany = mock(() =>
        Promise.resolve([
          { resourceScopes: ["slack:read"], isFullAccess: false },
        ])
      );

      const services = createAgentResourceServices({ db: mockDb as never });
      const result = await services.getUserContext("team_123", "user_1");

      expect(result.id).toBe("user_1");
      expect(result.name).toBe("John Doe");
      expect(result.email).toBe("john@example.com");
      expect(result.role).toBe("ADMIN");
      expect(result.permissions).toContain("read");
      expect(result.permissions).toContain("write");
      expect(result.permissions).toContain("admin");
      expect(result.permissions).toContain("slack:read");
    });

    it("handles member role permissions", async () => {
      const mockDb = createMockDb();

      mockDb.user.findUnique = mock(() =>
        Promise.resolve({
          id: "user_2",
          name: "Jane Doe",
          email: "jane@example.com",
        })
      );

      mockDb.usersOnTeam.findUnique = mock(() =>
        Promise.resolve({ role: "MEMBER" })
      );

      mockDb.connectorScope.findMany = mock(() => Promise.resolve([]));

      const services = createAgentResourceServices({ db: mockDb as never });
      const result = await services.getUserContext("team_123", "user_2");

      expect(result.permissions).toContain("read");
      expect(result.permissions).toContain("write");
      expect(result.permissions).not.toContain("admin");
    });

    it("handles full access scope", async () => {
      const mockDb = createMockDb();

      mockDb.user.findUnique = mock(() =>
        Promise.resolve({
          id: "user_3",
          name: "Admin User",
          email: "admin@example.com",
        })
      );

      mockDb.usersOnTeam.findUnique = mock(() =>
        Promise.resolve({ role: "VIEWER" })
      );

      mockDb.connectorScope.findMany = mock(() =>
        Promise.resolve([{ resourceScopes: [], isFullAccess: true }])
      );

      const services = createAgentResourceServices({ db: mockDb as never });
      const result = await services.getUserContext("team_123", "user_3");

      expect(result.permissions).toContain("full_access");
    });
  });

  describe("getTeamStats", () => {
    it("returns aggregated team statistics", async () => {
      const mockDb = createMockDb();
      const lastSyncAt = new Date("2024-01-15T10:00:00Z");

      mockDb.connector.groupBy = mock(() =>
        Promise.resolve([
          { status: "ACTIVE", _count: { id: 3 } },
          { status: "ERROR", _count: { id: 1 } },
        ])
      );

      mockDb.indexedDocument.count = mock(() => Promise.resolve(2500));

      mockDb.userSearchProfile.aggregate = mock(() =>
        Promise.resolve({
          _sum: { searchCount: 156 },
          _avg: { avgDwellMs: 85.5 },
        })
      );

      mockDb.connector.findFirst = mock(() =>
        Promise.resolve({ lastSyncedAt: lastSyncAt })
      );

      const services = createAgentResourceServices({ db: mockDb as never });
      const result = await services.getTeamStats("team_123");

      expect(result.documentCount).toBe(2500);
      expect(result.connectorCount).toBe(4);
      expect(result.activeConnectors).toBe(3);
      expect(result.lastSyncAt).toEqual(lastSyncAt);
      expect(result.searchesLast24h).toBe(156);
      expect(result.avgSearchLatencyMs).toBe(86);
    });

    it("handles null values gracefully", async () => {
      const mockDb = createMockDb();

      mockDb.connector.groupBy = mock(() => Promise.resolve([]));
      mockDb.indexedDocument.count = mock(() => Promise.resolve(0));
      mockDb.userSearchProfile.aggregate = mock(() =>
        Promise.resolve({
          _sum: { searchCount: null },
          _avg: { avgDwellMs: null },
        })
      );
      mockDb.connector.findFirst = mock(() => Promise.resolve(null));

      const services = createAgentResourceServices({ db: mockDb as never });
      const result = await services.getTeamStats("team_123");

      expect(result.documentCount).toBe(0);
      expect(result.connectorCount).toBe(0);
      expect(result.activeConnectors).toBe(0);
      expect(result.lastSyncAt).toBeNull();
      expect(result.searchesLast24h).toBe(0);
      expect(result.avgSearchLatencyMs).toBe(0);
    });
  });

  describe("getMemoryStats", () => {
    it("returns memory statistics from composition events", async () => {
      const mockDb = createMockDb();

      mockDb.compositionEvent.count = mock(() => Promise.resolve(450));
      mockDb.userFeedback.count = mock(() => Promise.resolve(35));
      mockDb.agentExecutionTrace.count = mock(() => Promise.resolve(120));

      const services = createAgentResourceServices({ db: mockDb as never });
      const result = await services.getMemoryStats("team_123");

      expect(result.episodic).toBe(450);
      expect(result.semantic).toBe(120);
      expect(result.procedural).toBe(35);
      expect(result.total).toBe(605);
    });

    it("handles empty memory", async () => {
      const mockDb = createMockDb();

      const services = createAgentResourceServices({ db: mockDb as never });
      const result = await services.getMemoryStats("team_123");

      expect(result.total).toBe(0);
    });
  });
});
