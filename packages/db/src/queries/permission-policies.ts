/**
 * Permission Policy Queries
 * Query functions for permission policies, groups, and assignments
 */

import type {
  GroupMember,
  PermissionGroup,
  PermissionPolicy,
  PolicyAssignment,
  ResourcePermission,
} from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// Permission Policy Types
// ============================================================================

export interface ListPoliciesOptions {
  resourceType?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface PolicyWithAssignments extends PermissionPolicy {
  assignments: PolicyAssignment[];
}

export interface ListGroupsOptions {
  groupType?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface GroupWithMembers extends PermissionGroup {
  members: GroupMember[];
}

// ============================================================================
// Permission Policy Queries
// ============================================================================

/**
 * List permission policies for a team
 */
export const listPermissionPolicies = async (
  db: Database,
  teamId: string,
  options: ListPoliciesOptions = {}
): Promise<{ policies: PermissionPolicy[]; total: number }> => {
  const { resourceType, isActive, limit = 50, offset = 0 } = options;

  const where = {
    teamId,
    ...(isActive !== undefined && { isActive }),
    ...(resourceType && { resourceTypes: { has: resourceType } }),
  };

  const [policies, total] = await Promise.all([
    db.permissionPolicy.findMany({
      where,
      orderBy: [{ priority: "desc" }, { name: "asc" }],
      take: limit,
      skip: offset,
    }),
    db.permissionPolicy.count({ where }),
  ]);

  return { policies, total };
};

/**
 * Get policy by ID with assignments
 */
export const getPolicyById = async (
  db: Database,
  policyId: string,
  teamId: string
): Promise<PolicyWithAssignments | null> => {
  const policy = await db.permissionPolicy.findFirst({
    where: { id: policyId, teamId },
    include: { assignments: true },
  });

  return policy;
};

/**
 * Get policy by name
 */
export const getPolicyByName = async (
  db: Database,
  teamId: string,
  name: string
): Promise<PermissionPolicy | null> =>
  db.permissionPolicy.findUnique({
    where: { teamId_name: { teamId, name } },
  });

// ============================================================================
// Permission Group Queries
// ============================================================================

/**
 * List permission groups for a team
 */
export const listPermissionGroups = async (
  db: Database,
  teamId: string,
  options: ListGroupsOptions = {}
): Promise<{ groups: PermissionGroup[]; total: number }> => {
  const { groupType, isActive, search, limit = 50, offset = 0 } = options;

  const where = {
    teamId,
    ...(groupType && { groupType }),
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [groups, total] = await Promise.all([
    db.permissionGroup.findMany({
      where,
      orderBy: { name: "asc" },
      take: limit,
      skip: offset,
    }),
    db.permissionGroup.count({ where }),
  ]);

  return { groups, total };
};

/**
 * Get permission group by ID with members
 */
export const getPermissionGroupById = async (
  db: Database,
  groupId: string,
  teamId: string
): Promise<GroupWithMembers | null> => {
  const group = await db.permissionGroup.findFirst({
    where: { id: groupId, teamId },
    include: {
      members: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return group;
};

/**
 * Get group by name
 */
export const getPermissionGroupByName = async (
  db: Database,
  teamId: string,
  name: string
): Promise<PermissionGroup | null> =>
  db.permissionGroup.findUnique({
    where: { teamId_name: { teamId, name } },
  });

/**
 * Get groups for a user
 */
export const getUserPermissionGroups = async (
  db: Database,
  userId: string,
  teamId: string
): Promise<PermissionGroup[]> => {
  const memberships = await db.groupMember.findMany({
    where: { userId },
    include: {
      group: true,
    },
  });

  return memberships
    .filter((m) => m.group.teamId === teamId)
    .map((m) => m.group);
};

// ============================================================================
// Resource Permission Queries
// ============================================================================

/**
 * Get resource permissions
 */
export const getResourcePermissions = async (
  db: Database,
  resourceType: string,
  resourceId: string,
  teamId: string
): Promise<ResourcePermission[]> =>
  db.resourcePermission.findMany({
    where: {
      teamId,
      resourceType: resourceType as any,
      resourceId,
    },
    orderBy: { grantedAt: "desc" },
  });

/**
 * Check if user has permission on resource
 */
export const checkResourcePermission = async (
  db: Database,
  userId: string,
  resourceType: string,
  resourceId: string,
  permission: string
): Promise<boolean> => {
  // Check direct user permission
  const directPerm = await db.resourcePermission.findFirst({
    where: {
      resourceType: resourceType as any,
      resourceId,
      granteeType: "USER",
      granteeId: userId,
      permissions: { has: permission },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (directPerm) return true;

  // Check group permissions
  const userGroups = await db.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });

  if (userGroups.length > 0) {
    const groupPerm = await db.resourcePermission.findFirst({
      where: {
        resourceType: resourceType as any,
        resourceId,
        granteeType: "GROUP",
        granteeId: { in: userGroups.map((g) => g.groupId) },
        permissions: { has: permission },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (groupPerm) return true;
  }

  return false;
};

// ============================================================================
// Access Audit Log Queries
// ============================================================================

export interface ListAuditLogOptions {
  userId?: string;
  eventType?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * List access audit logs
 */
export const listAccessAuditLogs = async (
  db: Database,
  teamId: string,
  options: ListAuditLogOptions = {}
): Promise<{ logs: any[]; total: number }> => {
  const {
    userId,
    eventType,
    resourceType,
    resourceId,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options;

  const where = {
    teamId,
    ...(userId && { userId }),
    ...(eventType && { eventType: eventType as any }),
    ...(resourceType && { resourceType }),
    ...(resourceId && { resourceId }),
    ...(startDate && { createdAt: { gte: startDate } }),
    ...(endDate && { createdAt: { lte: endDate } }),
  };

  const [logs, total] = await Promise.all([
    db.accessAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.accessAuditLog.count({ where }),
  ]);

  return { logs, total };
};
