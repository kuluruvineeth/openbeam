import type { Database } from "@openplane/db";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
} from "@openplane/db/mutations/api-keys";
import { getTeamMembership } from "@openplane/db/queries/teams";

export type TeamApiKeyActor =
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

export type TeamApiKeyErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND";

export class TeamApiKeyError extends Error {
  readonly code: TeamApiKeyErrorCode;

  constructor(code: TeamApiKeyErrorCode, message: string) {
    super(message);
    this.name = "TeamApiKeyError";
    this.code = code;
  }
}

export function isTeamApiKeyManagerRole(
  role: string | null | undefined
): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export interface TeamApiKeyActorInput {
  actor: TeamApiKeyActor;
  teamId: string;
}

export interface CreateTeamApiKeyForActorInput extends TeamApiKeyActorInput {
  name: string;
  scopes?: string[];
  expiresAt?: Date;
}

export interface RevokeTeamApiKeyForActorInput extends TeamApiKeyActorInput {
  apiKeyId: string;
}

async function authorizeTeamApiKeyActor(
  db: Database,
  input: TeamApiKeyActorInput
): Promise<void> {
  if (input.actor.type === "none") {
    throw new TeamApiKeyError("UNAUTHORIZED", "Unauthorized");
  }

  if (input.actor.type === "apiKey") {
    if (input.actor.teamId !== input.teamId) {
      throw new TeamApiKeyError("FORBIDDEN", "Forbidden");
    }
    return;
  }

  const membership = await getTeamMembership(
    db,
    input.actor.userId,
    input.teamId
  );
  if (!isTeamApiKeyManagerRole(membership?.role)) {
    throw new TeamApiKeyError("FORBIDDEN", "Forbidden");
  }
}

export async function createTeamApiKeyForActor(
  db: Database,
  input: CreateTeamApiKeyForActorInput
) {
  await authorizeTeamApiKeyActor(db, input);
  return createApiKey(db, {
    teamId: input.teamId,
    name: input.name,
    scopes: input.scopes,
    expiresAt: input.expiresAt,
  });
}

export async function listTeamApiKeysForActor(
  db: Database,
  input: TeamApiKeyActorInput
) {
  await authorizeTeamApiKeyActor(db, input);
  return listApiKeys(db, { teamId: input.teamId });
}

export async function revokeTeamApiKeyForActor(
  db: Database,
  input: RevokeTeamApiKeyForActorInput
): Promise<void> {
  await authorizeTeamApiKeyActor(db, input);
  const revoked = await revokeApiKey(db, {
    id: input.apiKeyId,
    teamId: input.teamId,
  });
  if (!revoked) {
    throw new TeamApiKeyError("NOT_FOUND", "API key not found");
  }
}
