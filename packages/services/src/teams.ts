import {
  createTeam,
  type Database,
  getTeamMembership,
  getTeamSummaryById,
  listUserTeams,
  updateActiveTeamForUser,
} from "@openbeam/db";

export type TeamRoleValue = "OWNER" | "ADMIN" | "MEMBER";

const VALID_TEAM_ROLES = new Set<TeamRoleValue>(["OWNER", "ADMIN", "MEMBER"]);

export type TeamActor =
  | {
      type: "session";
      userId: string;
    }
  | {
      type: "apiKey";
      teamId: string;
    }
  | {
      type: "none";
    };

export type TeamServiceErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BAD_REQUEST";

export class TeamServiceError extends Error {
  readonly code: TeamServiceErrorCode;

  constructor(code: TeamServiceErrorCode, message: string) {
    super(message);
    this.name = "TeamServiceError";
    this.code = code;
  }
}

export interface TeamSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: TeamRoleValue;
}

export interface CreateTeamForActorInput {
  actor: TeamActor;
  name: string;
  slug: string;
}

export interface SwitchTeamForActorInput {
  actor: TeamActor;
  teamId: string;
}

export interface TeamRoleForActorInput {
  actor: TeamActor;
  teamId: string;
}

function assertSessionActor(
  actor: TeamActor,
  message: string
): { type: "session"; userId: string } {
  if (actor.type === "none") {
    throw new TeamServiceError(
      "UNAUTHORIZED",
      "Session authentication required"
    );
  }
  if (actor.type !== "session") {
    throw new TeamServiceError("FORBIDDEN", message);
  }
  return actor;
}

export async function listTeamsForActor(
  db: Database,
  actor: TeamActor
): Promise<TeamSummary[]> {
  if (actor.type === "none") {
    throw new TeamServiceError("UNAUTHORIZED", "Unauthorized");
  }
  if (actor.type === "apiKey") {
    const team = await getTeamSummaryById(db, actor.teamId);
    if (!team) {
      return [];
    }
    return [
      {
        id: team.id,
        name: team.name,
        slug: team.slug,
        logoUrl: team.logo ?? null,
        role: "OWNER",
      },
    ];
  }
  return listUserTeams(db, actor.userId);
}

function isPrismaUniqueConstraintError(
  error: unknown
): error is Error & { code: string } {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

export async function createTeamForActor(
  db: Database,
  input: CreateTeamForActorInput
): Promise<{ id: string; name: string; slug: string }> {
  const actor = assertSessionActor(input.actor, "API keys cannot create teams");
  try {
    return await createTeam(db, {
      name: input.name,
      slug: input.slug,
      userId: actor.userId,
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw new TeamServiceError(
        "CONFLICT",
        "Team with this slug already exists"
      );
    }
    throw new TeamServiceError(
      "BAD_REQUEST",
      error instanceof Error ? error.message : "Team creation failed"
    );
  }
}

export async function switchTeamForActor(
  db: Database,
  input: SwitchTeamForActorInput
): Promise<void> {
  const actor = assertSessionActor(
    input.actor,
    "API keys cannot switch active team"
  );
  try {
    await updateActiveTeamForUser(db, actor.userId, input.teamId);
  } catch {
    throw new TeamServiceError(
      "FORBIDDEN",
      "User is not a member of this team"
    );
  }
}

export async function getTeamRoleForActor(
  db: Database,
  input: TeamRoleForActorInput
): Promise<TeamRoleValue | null> {
  if (input.actor.type === "none") {
    throw new TeamServiceError(
      "UNAUTHORIZED",
      "Session authentication required"
    );
  }
  if (input.actor.type === "apiKey") {
    if (input.actor.teamId !== input.teamId) {
      throw new TeamServiceError("NOT_FOUND", "Membership not found");
    }
    return "OWNER";
  }
  const membership = await getTeamMembership(
    db,
    input.actor.userId,
    input.teamId
  );
  if (!membership) {
    throw new TeamServiceError("NOT_FOUND", "Membership not found");
  }
  if (!VALID_TEAM_ROLES.has(membership.role as TeamRoleValue)) {
    throw new TeamServiceError(
      "BAD_REQUEST",
      `Unknown role: ${membership.role}`
    );
  }
  return membership.role as TeamRoleValue;
}
