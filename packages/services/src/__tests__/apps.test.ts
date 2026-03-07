import { describe, expect, it } from "bun:test";
import type { Database } from "@openbeam/db";
import {
  AppsServiceError,
  createConnectorForTeam,
  deleteConnectorForTeam,
  getConnectorForTeam,
  listConnectorsForTeam,
  updateConnectorResourceForTeam,
} from "../apps";

function createDatabaseStub(options?: {
  connectorTeamId?: string;
  membershipRole?: "OWNER" | "ADMIN" | "MEMBER" | null;
  resourceTeamId?: string | null;
}) {
  const connectorTeamId = options?.connectorTeamId ?? "team_1";
  const membershipRole = options?.membershipRole ?? "OWNER";
  const resourceTeamId = options?.resourceTeamId ?? "team_1";

  return {
    connector: {
      findMany: async () => [
        {
          id: "connector_1",
          app: "SLACK",
          teamId: "team_1",
          status: "ACTIVE",
          config: { channel: "general" },
        },
      ],
      findFirst: async () => null,
      findUnique: async () => ({
        id: "connector_1",
        app: "SLACK",
        teamId: connectorTeamId,
        status: "ACTIVE",
        config: { channel: "general" },
      }),
      create: async (input: {
        data: {
          teamId: string;
          userId: string;
          app: string;
          workspaceExternalId: string;
          name: string;
          type: string;
          authType: string;
          config: unknown;
        };
      }) => ({
        id: "connector_2",
        teamId: input.data.teamId,
        userId: input.data.userId,
        app: input.data.app,
        workspaceExternalId: input.data.workspaceExternalId,
        name: input.data.name,
        type: input.data.type,
        authType: input.data.authType,
        config: input.data.config,
        status: "CONNECTING",
      }),
      update: async (input: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => ({
        id: input.where.id,
        teamId: connectorTeamId,
        status: "ACTIVE",
        ...input.data,
      }),
    },
    connectorResource: {
      findUnique: async () =>
        resourceTeamId
          ? {
              connector: {
                teamId: resourceTeamId,
              },
            }
          : null,
      update: async (input: {
        where: { id: string };
        data: { syncEnabled: boolean };
      }) => ({
        id: input.where.id,
        syncEnabled: input.data.syncEnabled,
      }),
    },
    usersOnTeam: {
      findUnique: async () =>
        membershipRole
          ? {
              role: membershipRole,
            }
          : null,
    },
  } as unknown as Database;
}

describe("apps service", () => {
  it("lists connectors for a team", async () => {
    const db = createDatabaseStub();
    const result = await listConnectorsForTeam(db, { teamId: "team_1" });

    expect(result.connectors.length).toBeGreaterThan(0);
    const slack = result.connectors.find(
      (connector) => connector.id === "SLACK"
    );
    expect(slack?.installed).toBe(true);
    expect(slack?.connectorId).toBe("connector_1");
  });

  it("creates connector for session actor", async () => {
    const db = createDatabaseStub();
    const created = await createConnectorForTeam(db, {
      teamId: "team_1",
      authContext: { type: "session", userId: "user_1" },
      appId: "SLACK",
      workspaceExternalId: "workspace_1",
      name: "Slack",
      type: "SOURCE",
      authType: "OAUTH2",
      config: { channel: "general" },
    });

    expect(created.id).toBe("connector_2");
    expect(created.teamId).toBe("team_1");
  });

  it("returns forbidden when deleting connector without admin role", async () => {
    const db = createDatabaseStub({ membershipRole: "MEMBER" });

    await expect(
      deleteConnectorForTeam(db, {
        teamId: "team_1",
        connectorId: "connector_1",
        authContext: { type: "session", userId: "user_1" },
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("returns not found when connector lookup fails", async () => {
    const db = {
      ...createDatabaseStub(),
      connector: {
        ...createDatabaseStub().connector,
        findUnique: async () => null,
      },
    } as unknown as Database;

    await expect(
      getConnectorForTeam(db, {
        teamId: "team_1",
        id: "connector_missing",
      })
    ).rejects.toBeInstanceOf(AppsServiceError);
  });

  it("returns not found when resource belongs to another team", async () => {
    const db = createDatabaseStub({ resourceTeamId: "team_2" });

    await expect(
      updateConnectorResourceForTeam(db, {
        teamId: "team_1",
        resourceId: "resource_1",
        syncEnabled: true,
      })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
