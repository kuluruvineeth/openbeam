import {
  type Database,
  getConnectorIdsByTeam,
  getDocumentPermissions,
  getPermissionSyncStatus,
  getPermissionSyncStatusesByTeam,
  getTeamMembership,
  getTeamPermissionStats,
  getUserConnectorScopes,
  getUserGroupMemberships,
} from "@openplane/db";
import { getPermissionCache } from "@openplane/redis";
import { type ApiAccessAuthContext, isSessionAdminForTeam } from "./api-access";
import { createResolveTeamId } from "./lib/service-errors";
import { resolvePermissions } from "./permissions";

const cache = getPermissionCache();

export type PermissionsServiceErrorCode =
  | "MISSING_TEAM"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BAD_REQUEST";

export class PermissionsServiceError extends Error {
  readonly code: PermissionsServiceErrorCode;

  constructor(code: PermissionsServiceErrorCode, message: string) {
    super(message);
    this.name = "PermissionsServiceError";
    this.code = code;
  }
}

interface ResolvedAuthUser {
  userId: string;
  email: string | null;
  isSession: boolean;
}

const resolveTeamId = createResolveTeamId(PermissionsServiceError);

function resolveAuthUser(
  authContext: ApiAccessAuthContext
): ResolvedAuthUser | null {
  if (authContext.type === "session") {
    return {
      userId: authContext.userId,
      email: authContext.email ?? null,
      isSession: true,
    };
  }

  if (authContext.type === "apiKey") {
    return {
      userId: `api_key:${authContext.apiKeyId ?? "unknown"}`,
      email: null,
      isSession: false,
    };
  }

  return null;
}

async function resolveTargetUserId(
  db: Database,
  input: {
    authContext: ApiAccessAuthContext;
    teamId: string;
    requestedUserId?: string;
  }
): Promise<string> {
  const current = resolveAuthUser(input.authContext);
  if (!current) {
    throw new PermissionsServiceError("UNAUTHORIZED", "Unauthorized");
  }

  if (input.authContext.type === "apiKey") {
    if (!input.requestedUserId) {
      throw new PermissionsServiceError(
        "BAD_REQUEST",
        "userId is required for API key requests"
      );
    }
    return input.requestedUserId;
  }

  if (!input.requestedUserId || input.requestedUserId === current.userId) {
    return current.userId;
  }

  const admin = await isSessionAdminForTeam(
    db,
    input.authContext,
    input.teamId
  );
  if (!admin) {
    throw new PermissionsServiceError(
      "FORBIDDEN",
      "Admin or Owner role required"
    );
  }

  return input.requestedUserId;
}

async function requireAdmin(
  db: Database,
  input: {
    authContext: ApiAccessAuthContext;
    teamId: string;
  }
): Promise<void> {
  const admin = await isSessionAdminForTeam(
    db,
    input.authContext,
    input.teamId
  );
  if (!admin) {
    throw new PermissionsServiceError(
      "FORBIDDEN",
      "Admin or Owner role required"
    );
  }
}

export async function getPermissionSyncStatusForTeam(
  db: Database,
  input: {
    teamId: string | null;
    connectorId: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const status = await getPermissionSyncStatus(db, input.connectorId);

  if (!status || status.teamId !== teamId) {
    return null;
  }

  return status;
}

export async function listPermissionSyncStatusesForTeam(
  db: Database,
  input: {
    teamId: string | null;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  return await getPermissionSyncStatusesByTeam(db, teamId);
}

export async function invalidatePermissionsCacheForTeam(
  db: Database,
  input: {
    teamId: string | null;
    authContext: ApiAccessAuthContext;
    scope: "user" | "connector" | "all";
    userId?: string;
    connectorId?: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  await requireAdmin(db, {
    authContext: input.authContext,
    teamId,
  });

  if (input.scope === "user" && input.userId) {
    await cache.invalidateUser(teamId, input.userId);
  } else if (input.scope === "connector" && input.connectorId) {
    await cache.invalidateConnector(teamId, input.connectorId);
  } else if (input.scope === "all") {
    const connectors = await getConnectorIdsByTeam(db, teamId);
    await Promise.all(
      connectors.map((connector) =>
        cache.invalidateConnector(teamId, connector.id)
      )
    );
  }
}

export async function getMyPermissionsForTeam(
  db: Database,
  input: {
    teamId: string | null;
    authContext: ApiAccessAuthContext;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const authUser = resolveAuthUser(input.authContext);

  if (!authUser) {
    throw new PermissionsServiceError("UNAUTHORIZED", "Unauthorized");
  }

  if (input.authContext.type === "apiKey") {
    return {
      accessControlIds: [
        `team:${teamId}`,
        authUser.userId,
        `user:${authUser.userId}`,
      ],
      groupIds: [],
      connectorScopes: {},
      isTeamAdmin: true,
      resolvedAt: Date.now(),
    };
  }

  const membership = await getTeamMembership(db, authUser.userId, teamId);

  return resolvePermissions(db, {
    userId: authUser.userId,
    email: authUser.email,
    teamId,
    isTeamAdmin: membership?.role === "OWNER" || membership?.role === "ADMIN",
  });
}

export async function getDocumentPermissionsForTeam(
  db: Database,
  input: {
    teamId: string | null;
    documentId: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  return await getDocumentPermissions(db, input.documentId, teamId);
}

export async function getUserGroupsForTeam(
  db: Database,
  input: {
    teamId: string | null;
    authContext: ApiAccessAuthContext;
    userId?: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const targetUserId = await resolveTargetUserId(db, {
    authContext: input.authContext,
    teamId,
    requestedUserId: input.userId,
  });

  return getUserGroupMemberships(db, targetUserId, teamId);
}

export async function getUserConnectorScopesForTeam(
  db: Database,
  input: {
    teamId: string | null;
    authContext: ApiAccessAuthContext;
    userId?: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const targetUserId = await resolveTargetUserId(db, {
    authContext: input.authContext,
    teamId,
    requestedUserId: input.userId,
  });

  return getUserConnectorScopes(db, targetUserId, teamId);
}

export async function getPermissionStatsForTeam(
  db: Database,
  input: {
    teamId: string | null;
    authContext: ApiAccessAuthContext;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  await requireAdmin(db, {
    authContext: input.authContext,
    teamId,
  });

  return getTeamPermissionStats(db, teamId);
}
