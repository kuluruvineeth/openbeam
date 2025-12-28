import type { Database } from "../index";

export interface ResolveUserPermissionsResult {
  groupMemberships: { groupId: string; groupType: string; source: string }[];
  connectorScopes: {
    connectorId: string;
    resourceScopes: string[];
    isFullAccess: boolean;
  }[];
  teamRole: string | null;
}

export const resolveUserPermissionData = async (
  db: Database,
  userId: string,
  teamId: string,
  includeRole: boolean
): Promise<ResolveUserPermissionsResult> => {
  const [groupMemberships, connectorScopes, teamMembership] = await Promise.all(
    [
      db.groupMembership.findMany({
        where: { teamId, userId },
        select: { groupId: true, groupType: true, source: true },
      }),
      db.connectorScope.findMany({
        where: { teamId, userId },
        select: { connectorId: true, resourceScopes: true, isFullAccess: true },
      }),
      includeRole
        ? db.usersOnTeam.findUnique({
            where: { userId_teamId: { userId, teamId } },
            select: { role: true },
          })
        : null,
    ]
  );

  return {
    groupMemberships,
    connectorScopes,
    teamRole: teamMembership?.role ?? null,
  };
};

export const getDocumentPermissions = async (
  db: Database,
  documentId: string,
  teamId: string
) =>
  db.documentPermission.findMany({
    where: { documentId, teamId },
  });

export const getDocumentPermissionsByConnector = async (
  db: Database,
  connectorId: string,
  options?: { limit?: number; offset?: number }
) =>
  db.documentPermission.findMany({
    where: { connectorId },
    take: options?.limit,
    skip: options?.offset,
    orderBy: { syncedAt: "desc" },
  });

export const getUserGroupMemberships = async (
  db: Database,
  userId: string,
  teamId: string
) =>
  db.groupMembership.findMany({
    where: { userId, teamId },
  });

export const getGroupMembers = async (
  db: Database,
  groupId: string,
  teamId: string
) =>
  db.groupMembership.findMany({
    where: { groupId, teamId },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

export const getUserConnectorScopes = async (
  db: Database,
  userId: string,
  teamId: string
) =>
  db.connectorScope.findMany({
    where: { userId, teamId },
    include: {
      connector: {
        select: { id: true, name: true, app: true },
      },
    },
  });

export const getConnectorScope = async (
  db: Database,
  connectorId: string,
  userId: string
) =>
  db.connectorScope.findUnique({
    where: {
      connectorId_userId: {
        connectorId,
        userId,
      },
    },
  });

export interface CanUserAccessDocumentInput {
  userId: string;
  email: string | null;
  teamId: string;
  documentId: string;
}

interface PermissionMatchContext {
  userId: string;
  email: string | null;
  domain: string | null;
  userGroups: Set<string>;
}

function matchesPermission(
  perm: {
    granteeType: string;
    granteeId: string | null;
    granteeDomain: string | null;
  },
  ctx: PermissionMatchContext
): boolean {
  switch (perm.granteeType) {
    case "ANYONE":
      return true;
    case "USER":
      return perm.granteeId === ctx.userId || perm.granteeId === ctx.email;
    case "DOMAIN":
      return ctx.domain !== null && perm.granteeDomain === ctx.domain;
    case "GROUP":
      return perm.granteeId !== null && ctx.userGroups.has(perm.granteeId);
    default:
      return false;
  }
}

export const canUserAccessDocument = async (
  db: Database,
  input: CanUserAccessDocumentInput
): Promise<boolean> => {
  const permissions = await db.documentPermission.findMany({
    where: { documentId: input.documentId, teamId: input.teamId },
  });

  if (permissions.length === 0) {
    return true;
  }

  const groupIds = permissions
    .filter((p) => p.granteeType === "GROUP" && p.granteeId)
    .map((p) => p.granteeId as string);

  const userGroups =
    groupIds.length > 0
      ? new Set(
          (
            await db.groupMembership.findMany({
              where: {
                userId: input.userId,
                teamId: input.teamId,
                groupId: { in: groupIds },
              },
              select: { groupId: true },
            })
          ).map((g) => g.groupId)
        )
      : new Set<string>();

  const ctx: PermissionMatchContext = {
    userId: input.userId,
    email: input.email,
    domain: input.email?.split("@")[1] ?? null,
    userGroups,
  };

  return permissions.some((perm) => matchesPermission(perm, ctx));
};

export const getPermissionSyncStatus = async (
  db: Database,
  connectorId: string
) =>
  db.permissionSyncStatus.findUnique({
    where: { connectorId },
  });

export const getPermissionSyncStatusesByTeam = async (
  db: Database,
  teamId: string
) =>
  db.permissionSyncStatus.findMany({
    where: { teamId },
    include: {
      connector: {
        select: { id: true, name: true, app: true, status: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

export const getTeamPermissionStats = async (db: Database, teamId: string) => {
  const [documentCount, groupCount, userCount] = await Promise.all([
    db.documentPermission.count({ where: { teamId } }),
    db.groupMembership.groupBy({
      by: ["groupId"],
      where: { teamId },
      _count: true,
    }),
    db.groupMembership.groupBy({
      by: ["userId"],
      where: { teamId },
      _count: true,
    }),
  ]);

  return {
    documentPermissions: documentCount,
    groups: groupCount.length,
    usersWithGroups: userCount.length,
  };
};

export const getGroupsBySource = async (
  db: Database,
  teamId: string,
  source: string
) =>
  db.groupMembership.groupBy({
    by: ["groupId", "groupType"],
    where: { teamId, source },
    _count: { userId: true },
  });

export const getExpiredDocumentPermissions = async (
  db: Database,
  teamId: string,
  now = new Date()
) =>
  db.documentPermission.findMany({
    where: {
      teamId,
      expiresAt: { lte: now },
    },
  });

export const countDocumentPermissionsByConnector = async (
  db: Database,
  connectorId: string
) =>
  db.documentPermission.count({
    where: { connectorId },
  });

export const countGroupMembershipsByTeam = async (
  db: Database,
  teamId: string
) =>
  db.groupMembership.count({
    where: { teamId },
  });

export const countConnectorScopesByTeam = async (
  db: Database,
  teamId: string
) =>
  db.connectorScope.count({
    where: { teamId },
  });
