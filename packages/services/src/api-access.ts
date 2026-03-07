import type { Database } from "@openbeam/db";
import {
  getConnectorResourceWithTeamById,
  getTeamMembership,
  resolveTeamWriteUserId,
} from "@openbeam/db";

export type ApiAccessAuthContext =
  | {
      type: "session";
      userId: string;
      email?: string;
    }
  | {
      type: "apiKey";
      apiKeyId?: string;
    }
  | {
      type: "agent";
      agentId: string;
      teamId: string;
    }
  | {
      type: "none";
    };

export async function resolveWriteUserIdForAuthContext(
  db: Database,
  authContext: ApiAccessAuthContext,
  teamId: string
): Promise<string | null> {
  if (authContext.type === "session") {
    return authContext.userId;
  }

  if (authContext.type === "apiKey") {
    return await resolveTeamWriteUserId(db, teamId);
  }

  return null;
}

export async function isSessionAdminForTeam(
  db: Database,
  authContext: ApiAccessAuthContext,
  teamId: string
): Promise<boolean> {
  if (authContext.type !== "session") {
    return true;
  }

  const membership = await getTeamMembership(db, authContext.userId, teamId);
  if (!membership) {
    return false;
  }

  return membership.role === "OWNER" || membership.role === "ADMIN";
}

export async function getConnectorResourceTeamId(
  db: Database,
  resourceId: string
): Promise<string | null> {
  const resource = await getConnectorResourceWithTeamById(db, resourceId);
  return resource?.connector.teamId ?? null;
}
