import type { Database } from "@openbeam/db";
import {
  getPermissionSyncStatus,
  markPermissionSyncFailed,
  updatePermissionSyncStatus,
} from "@openbeam/db";
import { getPermissionCache } from "@openbeam/redis";

export interface PermissionSyncDependencies {
  db: Database;
}

export interface PermissionSyncInput {
  connectorId: string;
  teamId: string;
  connectorType: string;
  syncType: "full" | "incremental";
}

export interface PermissionSyncResult {
  permissionsUpdated: number;
  groupsUpdated: number;
  documentsUpdated: number;
  durationMs: number;
}

export function createPermissionSyncActivities(
  deps: PermissionSyncDependencies
) {
  const cache = getPermissionCache();

  return {
    acquirePermissionSyncLock(connectorId: string): Promise<string | null> {
      return cache.acquireSyncLock(connectorId);
    },

    async releasePermissionSyncLock(
      connectorId: string,
      token: string
    ): Promise<void> {
      await cache.releaseSyncLock(connectorId, token);
    },

    async markSyncStarted(input: PermissionSyncInput): Promise<void> {
      await updatePermissionSyncStatus(deps.db, input.connectorId, {
        status: "SYNCING",
      });
    },

    async markSyncCompleted(
      input: PermissionSyncInput,
      result: PermissionSyncResult
    ): Promise<void> {
      const now = new Date();
      const updateData: Record<string, unknown> = {
        status: "IDLE",
        lastError: null,
      };

      if (input.syncType === "full") {
        updateData.lastFullSync = now;
      } else {
        updateData.lastIncrementalSync = now;
      }

      updateData.totalPermissions = result.permissionsUpdated;
      updateData.totalGroups = result.groupsUpdated;

      await updatePermissionSyncStatus(deps.db, input.connectorId, updateData);
    },

    async markSyncFailed(connectorId: string, error: string): Promise<void> {
      await markPermissionSyncFailed(deps.db, connectorId, error);
    },

    async invalidateAffectedCaches(
      teamId: string,
      userIds: string[]
    ): Promise<void> {
      await Promise.all(
        userIds.map((userId) => cache.invalidateUser(teamId, userId))
      );
    },

    async getSyncCursor(connectorId: string): Promise<string | null> {
      const status = await getPermissionSyncStatus(deps.db, connectorId);
      return status?.syncCursor ?? null;
    },

    async updateSyncCursor(connectorId: string, cursor: string): Promise<void> {
      await updatePermissionSyncStatus(deps.db, connectorId, {
        syncCursor: cursor,
      });
    },
  };
}
