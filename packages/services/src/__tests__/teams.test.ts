import { describe, expect, it } from "bun:test";
import type { Database } from "@openbeam/db";
import {
  createTeamForActor,
  getTeamRoleForActor,
  listTeamsForActor,
  switchTeamForActor,
  TeamServiceError,
} from "../teams";

function createDatabaseStub(options?: {
  teamExists?: boolean;
  role?: "OWNER" | "ADMIN" | "MEMBER" | null;
  failSwitch?: boolean;
  failCreateWithUnique?: boolean;
}) {
  const teamExists = options?.teamExists ?? true;
  const role = options?.role ?? "MEMBER";
  const failSwitch = options?.failSwitch ?? false;
  const failCreateWithUnique = options?.failCreateWithUnique ?? false;

  return {
    team: {
      findUnique: async () =>
        teamExists
          ? {
              id: "team_1",
              name: "Alpha",
              slug: "alpha",
              logo: null,
            }
          : null,
    },
    usersOnTeam: {
      findMany: async () => [
        {
          role: "OWNER",
          team: {
            id: "team_1",
            name: "Alpha",
            slug: "alpha",
            logo: null,
          },
        },
      ],
      findUnique: async () => (role ? { role } : null),
      findFirst: async () => (failSwitch ? null : { userId: "user_1" }),
    },
    user: {
      update: () => {
        if (failSwitch) {
          throw new Error("User is not a member of this team");
        }
      },
    },
    $transaction: async (
      callback: (tx: {
        team: {
          create: (value: {
            data: { name: string; slug: string };
          }) => Promise<{ id: string; name: string; slug: string }>;
        };
        usersOnTeam: {
          create: (value: {
            data: { userId: string; teamId: string; role: "OWNER" };
          }) => Promise<void>;
        };
        user: {
          update: (value: {
            where: { id: string };
            data: { teamId: string };
          }) => Promise<void>;
        };
      }) => Promise<{ id: string; name: string; slug: string }>
    ) => {
      if (failCreateWithUnique) {
        throw new Error("Unique constraint failed");
      }
      return await callback({
        team: {
          create: (value) =>
            Promise.resolve({
              id: "team_2",
              name: value.data.name,
              slug: value.data.slug,
            }),
        },
        usersOnTeam: {
          create: () => Promise.resolve(),
        },
        user: {
          update: () => Promise.resolve(),
        },
      });
    },
  } as unknown as Database;
}

describe("teams service", () => {
  it("lists API key scoped team", async () => {
    const db = createDatabaseStub();
    const teams = await listTeamsForActor(db, {
      type: "apiKey",
      teamId: "team_1",
    });
    expect(teams.length).toBe(1);
    expect(teams[0]?.role).toBe("OWNER");
  });

  it("creates team for session actor", async () => {
    const db = createDatabaseStub();
    const team = await createTeamForActor(db, {
      actor: { type: "session", userId: "user_1" },
      name: "Beta",
      slug: "beta",
    });
    expect(team.slug).toBe("beta");
  });

  it("forbids team creation for api key actor", async () => {
    const db = createDatabaseStub();
    await expect(
      createTeamForActor(db, {
        actor: { type: "apiKey", teamId: "team_1" },
        name: "Beta",
        slug: "beta",
      })
    ).rejects.toBeInstanceOf(TeamServiceError);
  });

  it("maps unique failure to conflict", async () => {
    const db = createDatabaseStub({ failCreateWithUnique: true });
    await expect(
      createTeamForActor(db, {
        actor: { type: "session", userId: "user_1" },
        name: "Beta",
        slug: "beta",
      })
    ).rejects.toBeInstanceOf(TeamServiceError);
  });

  it("switches team for session actor", async () => {
    const db = createDatabaseStub();
    await switchTeamForActor(db, {
      actor: { type: "session", userId: "user_1" },
      teamId: "team_1",
    });
  });

  it("gets role for session actor membership", async () => {
    const db = createDatabaseStub({ role: "ADMIN" });
    const role = await getTeamRoleForActor(db, {
      actor: { type: "session", userId: "user_1" },
      teamId: "team_1",
    });
    expect(role).toBe("ADMIN");
  });

  it("returns not found role for mismatched api key team", async () => {
    const db = createDatabaseStub();
    await expect(
      getTeamRoleForActor(db, {
        actor: { type: "apiKey", teamId: "team_2" },
        teamId: "team_1",
      })
    ).rejects.toBeInstanceOf(TeamServiceError);
  });
});
