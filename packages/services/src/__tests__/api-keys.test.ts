import { describe, expect, it } from "bun:test";
import type { Database } from "@openplane/db";
import {
  createTeamApiKeyForActor,
  isTeamApiKeyManagerRole,
  listTeamApiKeysForActor,
  revokeTeamApiKeyForActor,
  TeamApiKeyError,
} from "../api-keys";

function createDatabaseStub(options?: {
  membershipRole?: "OWNER" | "ADMIN" | "MEMBER" | null;
  revokeCount?: number;
}) {
  const membershipRole = options?.membershipRole ?? null;
  const revokeCount = options?.revokeCount ?? 1;

  return {
    usersOnTeam: {
      findUnique: async () =>
        membershipRole ? { role: membershipRole } : null,
    },
    apiKey: {
      create: async (input: {
        data: {
          teamId: string;
          name: string;
          keyHash: string;
          prefix: string;
          scopes: string[];
          expiresAt?: Date;
        };
      }) => ({
        id: "key_1",
        prefix: input.data.prefix,
        createdAt: new Date("2026-02-15T00:00:00.000Z"),
      }),
      findMany: async () => [
        {
          id: "key_1",
          name: "default",
          prefix: "op_live_abcd1234",
          scopes: ["search:read"],
          lastUsedAt: null,
          expiresAt: null,
          revoked: false,
          createdAt: new Date("2026-02-15T00:00:00.000Z"),
        },
      ],
      updateMany: async () => ({ count: revokeCount }),
    },
  } as unknown as Database;
}

describe("isTeamApiKeyManagerRole", () => {
  it("accepts owner and admin roles", () => {
    expect(isTeamApiKeyManagerRole("OWNER")).toBe(true);
    expect(isTeamApiKeyManagerRole("ADMIN")).toBe(true);
  });

  it("rejects other roles", () => {
    expect(isTeamApiKeyManagerRole("MEMBER")).toBe(false);
    expect(isTeamApiKeyManagerRole(null)).toBe(false);
  });
});

describe("team api key services", () => {
  it("creates a key for owner membership", async () => {
    const db = createDatabaseStub({ membershipRole: "OWNER" });
    const result = await createTeamApiKeyForActor(db, {
      actor: { type: "session", userId: "user_1" },
      teamId: "team_1",
      name: "ci",
      scopes: ["teams:write"],
    });

    expect(result.id).toBe("key_1");
    expect(result.key.startsWith("op_live_")).toBe(true);
  });

  it("rejects non-manager session membership", async () => {
    const db = createDatabaseStub({ membershipRole: "MEMBER" });
    await expect(
      createTeamApiKeyForActor(db, {
        actor: { type: "session", userId: "user_1" },
        teamId: "team_1",
        name: "ci",
      })
    ).rejects.toBeInstanceOf(TeamApiKeyError);
  });

  it("rejects api key actor for another team", async () => {
    const db = createDatabaseStub();
    await expect(
      listTeamApiKeysForActor(db, {
        actor: { type: "apiKey", teamId: "team_2" },
        teamId: "team_1",
      })
    ).rejects.toBeInstanceOf(TeamApiKeyError);
  });

  it("lists keys for same-team api key actor", async () => {
    const db = createDatabaseStub();
    const result = await listTeamApiKeysForActor(db, {
      actor: { type: "apiKey", teamId: "team_1" },
      teamId: "team_1",
    });

    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe("key_1");
  });

  it("returns not found for missing revoke target", async () => {
    const db = createDatabaseStub({ membershipRole: "OWNER", revokeCount: 0 });
    await expect(
      revokeTeamApiKeyForActor(db, {
        actor: { type: "session", userId: "user_1" },
        teamId: "team_1",
        apiKeyId: "key_missing",
      })
    ).rejects.toBeInstanceOf(TeamApiKeyError);
  });
});
