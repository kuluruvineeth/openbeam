import type { Database } from "../index";

// === Permission Query Types ===

export type PermissionLevel = "VIEW" | "COMMENT" | "EDIT" | "ADMIN";
export type IdentityType = "USER" | "GROUP";

export interface DocumentPermissionResult {
  id: string;
  documentExternalId: string;
  connectorId: string;
  identityId: string;
  permission: PermissionLevel;
  inherited: boolean;
  inheritedFrom: string | null;
  identity: {
    id: string;
    externalId: string;
    identityType: IdentityType;
  };
}

export interface ExternalGroupResult {
  id: string;
  connectorId: string;
  teamId: string;
  externalGroupId: string;
  openplaneGroupId: string | null;
  name: string | null;
  description: string | null;
  memberCount: number | null;
  syncedAt: Date | null;
}

export interface ACLEntry {
  type: "user" | "group" | "ext" | "ext_group";
  id: string;
  permission: PermissionLevel;
}

// === Permission Queries ===

/**
 * Get document permissions by connector and external ID
 */
export const getDocumentPermissions = async (
  db: Database,
  connectorId: string,
  documentExternalId: string
): Promise<DocumentPermissionResult[]> => {
  const permissions = await db.documentPermission.findMany({
    where: {
      connectorId,
      documentExternalId,
    },
    include: {
      identity: true,
    },
  });

  return permissions.map((p) => ({
    id: p.id,
    documentExternalId: p.documentExternalId,
    connectorId: p.connectorId,
    identityId: p.identityId,
    permission: p.permission as PermissionLevel,
    inherited: p.inherited,
    inheritedFrom: p.inheritedFrom,
    identity: {
      id: p.identity.id,
      externalId: p.identity.externalId,
      identityType: p.identity.identityType as IdentityType,
    },
  }));
};

/**
 * Find external identity by connector and external ID
 */
export const findExternalIdentity = async (
  db: Database,
  connectorId: string,
  externalId: string
): Promise<{
  id: string;
  externalId: string;
  identityType: IdentityType;
} | null> => {
  const identity = await db.externalIdentity.findFirst({
    where: {
      connectorId,
      externalId,
    },
  });

  if (!identity) return null;

  return {
    id: identity.id,
    externalId: identity.externalId,
    identityType: identity.identityType as IdentityType,
  };
};

/**
 * Get indexed document with connector info
 */
export const getIndexedDocumentWithConnector = async (
  db: Database,
  documentId: string
): Promise<{
  id: string;
  externalId: string;
  connectorId: string;
  isPublic: boolean;
  teamId: string;
} | null> => {
  const doc = await db.indexedDocument.findUnique({
    where: { id: documentId },
    include: {
      connector: {
        select: { teamId: true },
      },
    },
  });

  if (!doc) return null;

  return {
    id: doc.id,
    externalId: doc.externalId,
    connectorId: doc.connectorId,
    isPublic: doc.isPublic,
    teamId: doc.connector.teamId,
  };
};

/**
 * Check if user is team member and get role
 */
export const getTeamMembership = async (
  db: Database,
  userId: string,
  teamId: string
): Promise<{ role: string } | null> => {
  const membership = await db.usersOnTeam.findFirst({
    where: {
      userId,
      teamId,
    },
    select: { role: true },
  });

  return membership;
};

/**
 * Find user by OAuth provider account ID
 */
export const findUserByProviderAccountId = async (
  db: Database,
  providerAccountId: string
): Promise<{ id: string } | null> => {
  const user = await db.user.findFirst({
    where: {
      accounts: {
        some: {
          providerAccountId,
        },
      },
    },
    select: { id: true },
  });

  return user;
};

/**
 * Get external group mapping
 */
export const getExternalGroupMapping = async (
  db: Database,
  connectorId: string,
  externalGroupId: string
): Promise<ExternalGroupResult | null> => {
  const mapping = await db.externalGroupMapping.findFirst({
    where: {
      connectorId,
      externalGroupId,
    },
  });

  if (!mapping) return null;

  return {
    id: mapping.id,
    connectorId: mapping.connectorId,
    teamId: mapping.teamId,
    externalGroupId: mapping.externalGroupId,
    openplaneGroupId: mapping.openplaneGroupId,
    name: mapping.name,
    description: mapping.description,
    memberCount: mapping.memberCount,
    syncedAt: mapping.syncedAt,
  };
};

/**
 * Check if user is member of a group
 */
export const isGroupMember = async (
  db: Database,
  groupId: string,
  userId: string
): Promise<boolean> => {
  const member = await db.groupMember.findFirst({
    where: {
      groupId,
      userId,
    },
  });

  return !!member;
};

/**
 * Get all external groups for a connector
 */
export const getConnectorExternalGroups = async (
  db: Database,
  connectorId: string
): Promise<ExternalGroupResult[]> => {
  const groups = await db.externalGroupMapping.findMany({
    where: { connectorId },
    orderBy: { name: "asc" },
  });

  return groups.map((g) => ({
    id: g.id,
    connectorId: g.connectorId,
    teamId: g.teamId,
    externalGroupId: g.externalGroupId,
    openplaneGroupId: g.openplaneGroupId,
    name: g.name,
    description: g.description,
    memberCount: g.memberCount,
    syncedAt: g.syncedAt,
  }));
};

/**
 * Get effective permissions for a user on a document
 * Returns the highest permission level the user has
 */
export const getEffectivePermission = async (
  db: Database,
  userId: string,
  documentId: string
): Promise<PermissionLevel | null> => {
  const doc = await getIndexedDocumentWithConnector(db, documentId);
  if (!doc) return null;

  // Public documents are viewable by all
  if (doc.isPublic) return "VIEW";

  // Check team membership
  const membership = await getTeamMembership(db, userId, doc.teamId);
  if (!membership) return null;

  // Admins and owners have full access
  if (membership.role === "ADMIN" || membership.role === "OWNER") {
    return "ADMIN";
  }

  // Get document permissions
  const permissions = await getDocumentPermissions(
    db,
    doc.connectorId,
    doc.externalId
  );

  const permissionLevels: PermissionLevel[] = [
    "VIEW",
    "COMMENT",
    "EDIT",
    "ADMIN",
  ];
  let highestLevel = -1;

  for (const perm of permissions) {
    // Check direct user permission
    if (perm.identity.identityType === "USER") {
      const user = await findUserByProviderAccountId(
        db,
        perm.identity.externalId
      );
      if (user?.id === userId) {
        const level = permissionLevels.indexOf(perm.permission);
        if (level > highestLevel) highestLevel = level;
      }
    }

    // Check group membership
    if (perm.identity.identityType === "GROUP") {
      const groupMapping = await getExternalGroupMapping(
        db,
        doc.connectorId,
        perm.identity.externalId
      );

      if (groupMapping?.openplaneGroupId) {
        const isMember = await isGroupMember(
          db,
          groupMapping.openplaneGroupId,
          userId
        );
        if (isMember) {
          const level = permissionLevels.indexOf(perm.permission);
          if (level > highestLevel) highestLevel = level;
        }
      }
    }
  }

  return highestLevel >= 0 ? permissionLevels[highestLevel] : null;
};

/**
 * Build ACL list for a document (for Vespa indexing)
 */
export const buildDocumentACL = async (
  db: Database,
  connectorId: string,
  documentExternalId: string
): Promise<string[]> => {
  const permissions = await db.documentPermission.findMany({
    where: {
      connectorId,
      documentExternalId,
    },
    include: {
      identity: true,
    },
  });

  const acl: string[] = [];

  for (const perm of permissions) {
    if (perm.identity.identityType === "USER") {
      // Try to map external user to OpenPlane user
      const user = await findUserByProviderAccountId(
        db,
        perm.identity.externalId
      );
      if (user) {
        acl.push(`user:${user.id}`);
      } else {
        acl.push(`ext:${perm.identity.externalId}`);
      }
    } else if (perm.identity.identityType === "GROUP") {
      // Try to map external group to OpenPlane group
      const groupMapping = await getExternalGroupMapping(
        db,
        connectorId,
        perm.identity.externalId
      );

      if (groupMapping?.openplaneGroupId) {
        acl.push(`group:${groupMapping.openplaneGroupId}`);
      } else {
        acl.push(`ext_group:${perm.identity.externalId}`);
      }
    }
  }

  return acl;
};

/**
 * Count permissions by connector
 */
export const countPermissionsByConnector = async (
  db: Database,
  connectorId: string
): Promise<number> =>
  db.documentPermission.count({
    where: { connectorId },
  });
