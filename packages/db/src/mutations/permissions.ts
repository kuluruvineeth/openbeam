import type {
  GroupType,
  PermissionGranteeType,
  PermissionRole,
  PermissionSyncState,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export interface CreateDocumentPermissionInput {
  teamId: string;
  documentId: string;
  connectorId: string;
  granteeType: PermissionGranteeType;
  granteeId?: string;
  granteeDomain?: string;
  role?: PermissionRole;
  source: string;
  externalId?: string;
  expiresAt?: Date;
}

export const createDocumentPermission = async (
  db: Database,
  input: CreateDocumentPermissionInput
) =>
  db.documentPermission.create({
    data: {
      teamId: input.teamId,
      documentId: input.documentId,
      connectorId: input.connectorId,
      granteeType: input.granteeType,
      granteeId: input.granteeId,
      granteeDomain: input.granteeDomain,
      role: input.role ?? "READER",
      source: input.source,
      externalId: input.externalId,
      expiresAt: input.expiresAt,
    },
  });

export const upsertDocumentPermission = async (
  db: Database,
  input: CreateDocumentPermissionInput
) => {
  const existing = await db.documentPermission.findFirst({
    where: {
      documentId: input.documentId,
      granteeType: input.granteeType,
      granteeId: input.granteeId ?? null,
      granteeDomain: input.granteeDomain ?? null,
    },
  });

  if (existing) {
    return db.documentPermission.update({
      where: { id: existing.id },
      data: {
        role: input.role ?? "READER",
        syncedAt: new Date(),
        expiresAt: input.expiresAt,
      },
    });
  }

  return db.documentPermission.create({
    data: {
      teamId: input.teamId,
      documentId: input.documentId,
      connectorId: input.connectorId,
      granteeType: input.granteeType,
      granteeId: input.granteeId,
      granteeDomain: input.granteeDomain,
      role: input.role ?? "READER",
      source: input.source,
      externalId: input.externalId,
      expiresAt: input.expiresAt,
    },
  });
};

export const deleteDocumentPermissions = async (
  db: Database,
  documentId: string,
  connectorId: string
) =>
  db.documentPermission.deleteMany({
    where: { documentId, connectorId },
  });

export const deleteDocumentPermissionsByConnector = async (
  db: Database,
  connectorId: string
) =>
  db.documentPermission.deleteMany({
    where: { connectorId },
  });

export interface CreateGroupMembershipInput {
  teamId: string;
  userId: string;
  groupId: string;
  groupType: GroupType;
  source: string;
  externalGroupId?: string;
  externalUserId?: string;
}

export const upsertGroupMembership = async (
  db: Database,
  input: CreateGroupMembershipInput
) =>
  db.groupMembership.upsert({
    where: {
      teamId_userId_groupId_source: {
        teamId: input.teamId,
        userId: input.userId,
        groupId: input.groupId,
        source: input.source,
      },
    },
    update: { syncedAt: new Date() },
    create: {
      teamId: input.teamId,
      userId: input.userId,
      groupId: input.groupId,
      groupType: input.groupType,
      source: input.source,
      externalGroupId: input.externalGroupId,
      externalUserId: input.externalUserId,
    },
  });

export interface DeleteGroupMembershipInput {
  teamId: string;
  userId: string;
  groupId: string;
  source: string;
}

export const deleteGroupMembership = async (
  db: Database,
  input: DeleteGroupMembershipInput
) =>
  db.groupMembership.delete({
    where: {
      teamId_userId_groupId_source: {
        teamId: input.teamId,
        userId: input.userId,
        groupId: input.groupId,
        source: input.source,
      },
    },
  });

export const deleteStaleGroupMemberships = async (
  db: Database,
  teamId: string,
  source: string,
  staleBefore: Date
) =>
  db.groupMembership.deleteMany({
    where: {
      teamId,
      source,
      syncedAt: { lt: staleBefore },
    },
  });

export const deleteGroupMembershipsBySource = async (
  db: Database,
  teamId: string,
  source: string
) =>
  db.groupMembership.deleteMany({
    where: { teamId, source },
  });

export interface UpsertConnectorScopeInput {
  teamId: string;
  connectorId: string;
  userId: string;
  resourceScopes?: string[];
  isFullAccess?: boolean;
}

export const upsertConnectorScope = async (
  db: Database,
  input: UpsertConnectorScopeInput
) =>
  db.connectorScope.upsert({
    where: {
      connectorId_userId: {
        connectorId: input.connectorId,
        userId: input.userId,
      },
    },
    update: {
      resourceScopes: input.resourceScopes ?? [],
      isFullAccess: input.isFullAccess ?? false,
      syncedAt: new Date(),
    },
    create: {
      teamId: input.teamId,
      connectorId: input.connectorId,
      userId: input.userId,
      resourceScopes: input.resourceScopes ?? [],
      isFullAccess: input.isFullAccess ?? false,
    },
  });

export const deleteConnectorScope = async (
  db: Database,
  connectorId: string,
  userId: string
) =>
  db.connectorScope.delete({
    where: {
      connectorId_userId: {
        connectorId,
        userId,
      },
    },
  });

export const deleteConnectorScopesByConnector = async (
  db: Database,
  connectorId: string
) =>
  db.connectorScope.deleteMany({
    where: { connectorId },
  });

export interface UpsertPermissionSyncStatusInput {
  teamId: string;
  connectorId: string;
  lastFullSync?: Date;
  lastIncrementalSync?: Date;
  syncCursor?: string;
  totalDocuments?: number;
  totalPermissions?: number;
  totalGroups?: number;
  totalUsers?: number;
  lastError?: string;
  errorCount?: number;
  status?: PermissionSyncState;
}

export const upsertPermissionSyncStatus = async (
  db: Database,
  input: UpsertPermissionSyncStatusInput
) =>
  db.permissionSyncStatus.upsert({
    where: { connectorId: input.connectorId },
    update: {
      lastFullSync: input.lastFullSync,
      lastIncrementalSync: input.lastIncrementalSync,
      syncCursor: input.syncCursor,
      totalDocuments: input.totalDocuments,
      totalPermissions: input.totalPermissions,
      totalGroups: input.totalGroups,
      totalUsers: input.totalUsers,
      lastError: input.lastError,
      errorCount: input.errorCount,
      status: input.status,
    },
    create: {
      teamId: input.teamId,
      connectorId: input.connectorId,
      lastFullSync: input.lastFullSync,
      lastIncrementalSync: input.lastIncrementalSync,
      syncCursor: input.syncCursor,
      totalDocuments: input.totalDocuments ?? 0,
      totalPermissions: input.totalPermissions ?? 0,
      totalGroups: input.totalGroups ?? 0,
      totalUsers: input.totalUsers ?? 0,
      lastError: input.lastError,
      errorCount: input.errorCount ?? 0,
      status: input.status ?? "IDLE",
    },
  });

export const updatePermissionSyncStatus = async (
  db: Database,
  connectorId: string,
  data: Partial<UpsertPermissionSyncStatusInput>
) =>
  db.permissionSyncStatus.update({
    where: { connectorId },
    data: {
      lastFullSync: data.lastFullSync,
      lastIncrementalSync: data.lastIncrementalSync,
      syncCursor: data.syncCursor,
      totalDocuments: data.totalDocuments,
      totalPermissions: data.totalPermissions,
      totalGroups: data.totalGroups,
      totalUsers: data.totalUsers,
      lastError: data.lastError,
      errorCount: data.errorCount,
      status: data.status,
    },
  });

export const markPermissionSyncFailed = async (
  db: Database,
  connectorId: string,
  error: string
) =>
  db.permissionSyncStatus.update({
    where: { connectorId },
    data: {
      status: "FAILED",
      lastError: error,
      errorCount: { increment: 1 },
    },
  });

export const resetPermissionSyncError = async (
  db: Database,
  connectorId: string
) =>
  db.permissionSyncStatus.update({
    where: { connectorId },
    data: {
      status: "IDLE",
      lastError: null,
      errorCount: 0,
    },
  });
