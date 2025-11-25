import type { Database } from "../index";
import type { IdentityType, PermissionLevel } from "../queries/permissions";

// === Permission Mutation Types ===

export interface SyncPermissionInput {
  connectorId: string;
  teamId: string;
  documentExternalId: string;
  principalExternalId: string;
  principalType: "user" | "group";
  permission: "view" | "comment" | "edit" | "admin";
  inherited: boolean;
  inheritedFrom?: string | null;
}

export interface UpsertExternalGroupInput {
  connectorId: string;
  teamId: string;
  externalGroupId: string;
  name?: string | null;
  description?: string | null;
  memberCount?: number | null;
  openplaneGroupId?: string | null;
}

// === Permission Mutations ===

/**
 * Create or get external identity
 */
export const getOrCreateExternalIdentity = async (
  db: Database,
  connectorId: string,
  teamId: string,
  externalId: string,
  identityType: IdentityType
): Promise<{ id: string; created: boolean }> => {
  const existing = await db.externalIdentity.findFirst({
    where: {
      connectorId,
      externalId,
    },
  });

  if (existing) {
    return { id: existing.id, created: false };
  }

  const created = await db.externalIdentity.create({
    data: {
      connectorId,
      teamId,
      externalId,
      identityType,
    },
  });

  return { id: created.id, created: true };
};

/**
 * Upsert document permission
 */
export const upsertDocumentPermission = async (
  db: Database,
  input: {
    documentExternalId: string;
    connectorId: string;
    identityId: string;
    permission: PermissionLevel;
    inherited: boolean;
    inheritedFrom?: string | null;
  }
): Promise<{ id: string; created: boolean }> => {
  const result = await db.documentPermission.upsert({
    where: {
      documentExternalId_connectorId_identityId: {
        documentExternalId: input.documentExternalId,
        connectorId: input.connectorId,
        identityId: input.identityId,
      },
    },
    update: {
      permission: input.permission,
      inherited: input.inherited,
      inheritedFrom: input.inheritedFrom,
      updatedAt: new Date(),
    },
    create: {
      documentExternalId: input.documentExternalId,
      connectorId: input.connectorId,
      identityId: input.identityId,
      permission: input.permission,
      inherited: input.inherited,
      inheritedFrom: input.inheritedFrom,
    },
  });

  return {
    id: result.id,
    created: result.createdAt.getTime() === result.updatedAt.getTime(),
  };
};

/**
 * Sync a single permission (handles identity creation)
 */
export const syncPermission = async (
  db: Database,
  input: SyncPermissionInput
): Promise<{ id: string; created: boolean }> => {
  // Get or create identity
  const identity = await getOrCreateExternalIdentity(
    db,
    input.connectorId,
    input.teamId,
    input.principalExternalId,
    input.principalType.toUpperCase() as IdentityType
  );

  // Upsert permission
  return upsertDocumentPermission(db, {
    documentExternalId: input.documentExternalId,
    connectorId: input.connectorId,
    identityId: identity.id,
    permission: input.permission.toUpperCase() as PermissionLevel,
    inherited: input.inherited,
    inheritedFrom: input.inheritedFrom,
  });
};

/**
 * Bulk sync permissions
 */
export const bulkSyncPermissions = async (
  db: Database,
  permissions: SyncPermissionInput[]
): Promise<{ created: number; updated: number }> => {
  let created = 0;
  let updated = 0;

  // Group by resource for efficiency
  const byResource = new Map<string, SyncPermissionInput[]>();
  for (const perm of permissions) {
    const key = `${perm.connectorId}:${perm.documentExternalId}`;
    if (!byResource.has(key)) {
      byResource.set(key, []);
    }
    byResource.get(key)!.push(perm);
  }

  // Process in transaction
  await db.$transaction(async (tx) => {
    for (const [_key, resourcePerms] of byResource) {
      for (const perm of resourcePerms) {
        // Get or create identity
        let identity = await tx.externalIdentity.findFirst({
          where: {
            connectorId: perm.connectorId,
            externalId: perm.principalExternalId,
          },
        });

        if (!identity) {
          identity = await tx.externalIdentity.create({
            data: {
              connectorId: perm.connectorId,
              teamId: perm.teamId,
              externalId: perm.principalExternalId,
              identityType: perm.principalType.toUpperCase() as IdentityType,
            },
          });
        }

        // Upsert permission
        const result = await tx.documentPermission.upsert({
          where: {
            documentExternalId_connectorId_identityId: {
              documentExternalId: perm.documentExternalId,
              connectorId: perm.connectorId,
              identityId: identity.id,
            },
          },
          update: {
            permission: perm.permission.toUpperCase() as PermissionLevel,
            inherited: perm.inherited,
            inheritedFrom: perm.inheritedFrom,
            updatedAt: new Date(),
          },
          create: {
            documentExternalId: perm.documentExternalId,
            connectorId: perm.connectorId,
            identityId: identity.id,
            permission: perm.permission.toUpperCase() as PermissionLevel,
            inherited: perm.inherited,
            inheritedFrom: perm.inheritedFrom,
          },
        });

        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          created++;
        } else {
          updated++;
        }
      }
    }
  });

  return { created, updated };
};

/**
 * Upsert external group mapping
 */
export const upsertExternalGroupMapping = async (
  db: Database,
  input: UpsertExternalGroupInput
): Promise<{ id: string; created: boolean }> => {
  const result = await db.externalGroupMapping.upsert({
    where: {
      connectorId_externalGroupId: {
        connectorId: input.connectorId,
        externalGroupId: input.externalGroupId,
      },
    },
    update: {
      openplaneGroupId: input.openplaneGroupId,
      name: input.name,
      description: input.description,
      memberCount: input.memberCount,
      syncedAt: new Date(),
      updatedAt: new Date(),
    },
    create: {
      connectorId: input.connectorId,
      teamId: input.teamId,
      externalGroupId: input.externalGroupId,
      openplaneGroupId: input.openplaneGroupId,
      name: input.name,
      description: input.description,
      memberCount: input.memberCount,
      syncedAt: new Date(),
    },
  });

  return {
    id: result.id,
    created: result.createdAt.getTime() === result.updatedAt.getTime(),
  };
};

/**
 * Delete document permission
 */
export const deleteDocumentPermission = async (
  db: Database,
  documentExternalId: string,
  connectorId: string,
  identityId: string
): Promise<boolean> => {
  try {
    await db.documentPermission.delete({
      where: {
        documentExternalId_connectorId_identityId: {
          documentExternalId,
          connectorId,
          identityId,
        },
      },
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Delete all permissions for a document
 */
export const deleteDocumentPermissions = async (
  db: Database,
  connectorId: string,
  documentExternalId: string
): Promise<number> => {
  const result = await db.documentPermission.deleteMany({
    where: {
      connectorId,
      documentExternalId,
    },
  });

  return result.count;
};

/**
 * Delete all permissions for a connector
 */
export const deleteConnectorPermissions = async (
  db: Database,
  connectorId: string
): Promise<number> => {
  const result = await db.documentPermission.deleteMany({
    where: { connectorId },
  });

  return result.count;
};

/**
 * Delete all external identities for a connector
 */
export const deleteConnectorExternalIdentities = async (
  db: Database,
  connectorId: string
): Promise<number> => {
  const result = await db.externalIdentity.deleteMany({
    where: { connectorId },
  });

  return result.count;
};

/**
 * Delete external group mapping
 */
export const deleteExternalGroupMapping = async (
  db: Database,
  connectorId: string,
  externalGroupId: string
): Promise<boolean> => {
  try {
    await db.externalGroupMapping.delete({
      where: {
        connectorId_externalGroupId: {
          connectorId,
          externalGroupId,
        },
      },
    });
    return true;
  } catch {
    return false;
  }
};

/**
 * Delete all external group mappings for a connector
 */
export const deleteConnectorExternalGroups = async (
  db: Database,
  connectorId: string
): Promise<number> => {
  const result = await db.externalGroupMapping.deleteMany({
    where: { connectorId },
  });

  return result.count;
};

/**
 * Revoke all permissions for a user across a team
 */
export const revokeUserPermissions = async (
  db: Database,
  userId: string,
  teamId: string
): Promise<number> => {
  // Get user's external identities
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      accounts: {
        select: { providerAccountId: true },
      },
    },
  });

  if (!user) return 0;

  // Find all external identities for this user
  const externalIds = user.accounts.map((a) => a.providerAccountId);

  const identities = await db.externalIdentity.findMany({
    where: {
      teamId,
      externalId: { in: externalIds },
    },
  });

  if (identities.length === 0) return 0;

  // Delete permissions
  const result = await db.documentPermission.deleteMany({
    where: {
      identityId: { in: identities.map((i) => i.id) },
    },
  });

  return result.count;
};
