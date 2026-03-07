import type { Database } from "@openbeam/db";
import type { ApiAccessAuthContext } from "../api-access";
import { resolveWriteUserIdForAuthContext } from "../api-access";

export function createResolveTeamId(
  ErrorClass: new (code: "MISSING_TEAM", message: string) => Error
) {
  return function resolveTeamId(teamId: string | null): string {
    if (!teamId) {
      throw new ErrorClass("MISSING_TEAM", "team_id is required");
    }
    return teamId;
  };
}

export function createResolveWriteUserId(
  ErrorClass: new (code: "NO_TEAM_USER", message: string) => Error
) {
  return async function resolveWriteUserId(
    db: Database,
    input: {
      authContext: ApiAccessAuthContext;
      teamId: string;
      message: string;
    }
  ): Promise<string> {
    const userId = await resolveWriteUserIdForAuthContext(
      db,
      input.authContext,
      input.teamId
    );

    if (!userId) {
      throw new ErrorClass("NO_TEAM_USER", input.message);
    }

    return userId;
  };
}
