import { type Database, resolveUserPermissionData } from "@openplane/db";
import { type CachedPermissionSet, getPermissionCache } from "@openplane/redis";

export interface PermissionContext {
  userId: string;
  email: string | null;
  teamId: string;
  isTeamAdmin?: boolean;
}

export interface ResolvedPermissions {
  accessControlIds: string[];
  groupIds: string[];
  connectorScopes: Record<string, string[]>;
  isTeamAdmin: boolean;
  resolvedAt: number;
}

const cache = getPermissionCache();

const STALE_THRESHOLD_MS = 5 * 60 * 1000;

export async function resolvePermissions(
  db: Database,
  ctx: PermissionContext
): Promise<ResolvedPermissions> {
  const cached = await cache.getUserPermissionSet(ctx.teamId, ctx.userId);

  if (cached && !isStale(cached)) {
    return {
      accessControlIds: buildAccessControlIds(cached),
      groupIds: cached.groupIds,
      connectorScopes: cached.connectorScopes,
      isTeamAdmin: cached.isTeamAdmin,
      resolvedAt: cached.cachedAt,
    };
  }

  const permData = await resolveUserPermissionData(
    db,
    ctx.userId,
    ctx.teamId,
    ctx.isTeamAdmin === undefined
  );

  const groupIds = permData.groupMemberships.map((m) => m.groupId);
  const domain = ctx.email ? extractDomain(ctx.email) : null;

  const scopeMap: Record<string, string[]> = {};
  for (const scope of permData.connectorScopes) {
    scopeMap[scope.connectorId] = scope.isFullAccess
      ? ["*"]
      : scope.resourceScopes;
  }

  const isTeamAdmin =
    ctx.isTeamAdmin ??
    (permData.teamRole === "OWNER" || permData.teamRole === "ADMIN");

  const permissionSet: CachedPermissionSet = {
    userId: ctx.userId,
    email: ctx.email,
    teamId: ctx.teamId,
    groupIds,
    domain,
    connectorScopes: scopeMap,
    isTeamAdmin,
    cachedAt: Date.now(),
  };

  await cache.setUserPermissionSet(ctx.teamId, ctx.userId, permissionSet);

  for (const groupId of groupIds) {
    await cache.trackGroupMember(ctx.teamId, groupId, ctx.userId);
  }

  for (const connectorId of Object.keys(scopeMap)) {
    await cache.trackConnectorUser(ctx.teamId, connectorId, ctx.userId);
  }

  return {
    accessControlIds: buildAccessControlIds(permissionSet),
    groupIds,
    connectorScopes: scopeMap,
    isTeamAdmin,
    resolvedAt: Date.now(),
  };
}

function buildAccessControlIds(perms: CachedPermissionSet): string[] {
  const ids: string[] = [perms.userId, `user:${perms.userId}`];

  if (perms.email) {
    ids.push(perms.email, `email:${perms.email}`);
  }

  ids.push(`team:${perms.teamId}`);

  for (const groupId of perms.groupIds) {
    ids.push(`group:${groupId}`);
  }

  if (perms.domain) {
    ids.push(`domain:${perms.domain}`);
  }

  return ids;
}

function isStale(cached: CachedPermissionSet): boolean {
  return Date.now() - cached.cachedAt > STALE_THRESHOLD_MS;
}

function extractDomain(email: string): string | null {
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1 || atIndex === email.length - 1) {
    return null;
  }
  return email.slice(atIndex + 1).toLowerCase();
}
