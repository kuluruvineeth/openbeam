/**
 * Permission Service
 *
 * Handles permission syncing, ACL building, and access control
 * for connector documents.
 *
 * This service uses the @openplane/db queries and mutations for
 * clean separation and reusability across layers.
 */
import prisma, {
  buildDocumentACL,
  bulkSyncPermissions,
  deleteConnectorExternalGroups,
  deleteConnectorPermissions,
  getConnectorExternalGroups,
  getEffectivePermission,
  getTeamMembership,
  type PermissionLevel,
  type SyncPermissionInput,
  upsertExternalGroupMapping,
} from "@openplane/db";
import { permissionCache } from "@openplane/redis";
import type { ExtractedPermission } from "../connectors/base-connector";
import logger from "../utils/logger";

// === Permission Service ===

class PermissionService {
  /**
   * Sync permissions from a connector
   */
  async syncPermissions(
    connectorId: string,
    teamId: string,
    permissions: ExtractedPermission[]
  ): Promise<{ created: number; updated: number; deleted: number }> {
    const inputs: SyncPermissionInput[] = permissions.map((perm) => ({
      connectorId,
      teamId,
      documentExternalId: perm.resourceExternalId,
      principalExternalId: perm.principalExternalId,
      principalType: perm.principalType,
      permission: perm.permission,
      inherited: perm.inherited,
      inheritedFrom: perm.inheritedFrom,
    }));

    try {
      const result = await bulkSyncPermissions(prisma, inputs);

      logger.info(
        {
          connectorId,
          created: result.created,
          updated: result.updated,
          total: permissions.length,
        },
        "Permissions synced"
      );

      return { ...result, deleted: 0 };
    } catch (error) {
      logger.error({ error, connectorId }, "Failed to sync permissions");
      return { created: 0, updated: 0, deleted: 0 };
    }
  }

  /**
   * Build access control list for a document
   */
  async buildACL(
    connectorId: string,
    documentExternalId: string
  ): Promise<string[]> {
    return buildDocumentACL(prisma, connectorId, documentExternalId);
  }

  /**
   * Check if a user has access to a document
   */
  async checkAccess(
    userId: string,
    documentId: string,
    requiredPermission: "view" | "comment" | "edit" | "admin" = "view"
  ): Promise<boolean> {
    // Check cache first
    const cached = await permissionCache.checkDocumentAccess(
      documentId,
      userId
    );
    if (cached !== null) {
      return cached;
    }

    // Get effective permission from database
    const effectivePermission = await getEffectivePermission(
      prisma,
      userId,
      documentId
    );

    if (!effectivePermission) {
      return false;
    }

    // Check if user's permission level is sufficient
    const permissionLevels: PermissionLevel[] = [
      "VIEW",
      "COMMENT",
      "EDIT",
      "ADMIN",
    ];
    const requiredLevel = permissionLevels.indexOf(
      requiredPermission.toUpperCase() as PermissionLevel
    );
    const userLevel = permissionLevels.indexOf(effectivePermission);

    const hasAccess = userLevel >= requiredLevel;

    // Cache the result
    if (hasAccess) {
      await permissionCache.setDocumentACL(documentId, [userId]);
    }

    return hasAccess;
  }

  /**
   * Invalidate permission cache for a document
   */
  async invalidateDocumentCache(documentId: string): Promise<void> {
    await permissionCache.invalidateDocumentACL(documentId);
  }

  /**
   * Invalidate all permission caches for a user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await permissionCache.invalidateUser(userId);
  }

  /**
   * Map external group to OpenPlane group
   */
  async mapExternalGroup(
    connectorId: string,
    teamId: string,
    externalGroupId: string,
    externalGroupName: string,
    openplaneGroupId?: string
  ): Promise<void> {
    await upsertExternalGroupMapping(prisma, {
      connectorId,
      teamId,
      externalGroupId,
      name: externalGroupName,
      openplaneGroupId,
    });
  }

  /**
   * Get all external groups for a connector
   */
  async getExternalGroups(
    connectorId: string
  ): Promise<
    Array<{ externalGroupId: string; name: string; mapped: boolean }>
  > {
    const groups = await getConnectorExternalGroups(prisma, connectorId);

    return groups.map((g) => ({
      externalGroupId: g.externalGroupId,
      name: g.name || g.externalGroupId,
      mapped: !!g.openplaneGroupId,
    }));
  }

  /**
   * Delete permissions for a connector (on disconnect)
   */
  async deleteConnectorPermissions(connectorId: string): Promise<number> {
    const count = await deleteConnectorPermissions(prisma, connectorId);

    // Also delete external group mappings
    await deleteConnectorExternalGroups(prisma, connectorId);

    logger.info(
      { connectorId, deleted: count },
      "Permissions deleted for connector"
    );

    return count;
  }

  /**
   * Check if user is team admin (for bypassing permission checks)
   */
  async isTeamAdmin(userId: string, teamId: string): Promise<boolean> {
    const membership = await getTeamMembership(prisma, userId, teamId);
    return membership?.role === "ADMIN" || membership?.role === "OWNER";
  }
}

// Export singleton
export const permissionService = new PermissionService();
