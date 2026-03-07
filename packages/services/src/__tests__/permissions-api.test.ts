import { describe, expect, it } from "bun:test";
import type { Database } from "@openbeam/db";
import {
  getMyPermissionsForTeam,
  getPermissionStatsForTeam,
  getPermissionSyncStatusForTeam,
  getUserGroupsForTeam,
  PermissionsServiceError,
} from "../permissions-api";

function createDatabaseStub(options?: {
  membershipRole?: "OWNER" | "ADMIN" | "MEMBER" | null;
  syncTeamId?: string;
}) {
  const membershipRole = options?.membershipRole ?? "MEMBER";
  const syncTeamId = options?.syncTeamId ?? "team_1";

  return {
    permissionSyncStatus: {
      findUnique: async () => ({
        id: "status_1",
        connectorId: "connector_1",
        teamId: syncTeamId,
      }),
      findMany: async () => [],
    },
    usersOnTeam: {
      findUnique: async () =>
        membershipRole ? { role: membershipRole } : null,
    },
    groupMembership: {
      findMany: async () => [{ id: "group_member_1" }],
      groupBy: async () => [],
    },
    documentPermission: {
      count: async () => 0,
      findMany: async () => [],
    },
    connectorScope: {
      findMany: async () => [],
    },
  } as unknown as Database;
}

describe("permissions api service", () => {
  it("returns null sync status when team mismatch", async () => {
    const db = createDatabaseStub({ syncTeamId: "team_2" });

    const status = await getPermissionSyncStatusForTeam(db, {
      teamId: "team_1",
      connectorId: "connector_1",
    });

    expect(status).toBeNull();
  });

  it("returns api key permissions snapshot", async () => {
    const db = createDatabaseStub();

    const permissions = await getMyPermissionsForTeam(db, {
      teamId: "team_1",
      authContext: { type: "apiKey", apiKeyId: "key_1" },
    });

    expect(permissions.isTeamAdmin).toBe(true);
    expect(permissions.accessControlIds.includes("team:team_1")).toBe(true);
  });

  it("requires user id for api key user groups", async () => {
    const db = createDatabaseStub();

    await expect(
      getUserGroupsForTeam(db, {
        teamId: "team_1",
        authContext: { type: "apiKey", apiKeyId: "key_1" },
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("forbids stats for non-admin session", async () => {
    const db = createDatabaseStub({ membershipRole: "MEMBER" });

    await expect(
      getPermissionStatsForTeam(db, {
        teamId: "team_1",
        authContext: { type: "session", userId: "user_1" },
      })
    ).rejects.toBeInstanceOf(PermissionsServiceError);
  });
});
