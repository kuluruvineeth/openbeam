/**
 * Permission Policy Mutations
 * Mutation functions for permission policies, groups, and assignments
 */

import type {
  AccessEventType,
  AssigneeType,
  GroupMember,
  PermissionGroup,
  PermissionPolicy,
  PolicyAssignment,
  PolicyEffect,
  Prisma,
  ResourcePermission,
  ResourceType,
} from "../../prisma/generated/client";
import type { Database } from "../index";

// ============================================================================
// Permission Policy Types
// ============================================================================

export interface CreatePolicyInput {
  teamId: string;
  name: string;
  description?: string;
  effect?: PolicyEffect;
  resourceTypes?: ResourceType[];
  resourceIds?: string[];
  conditions?: Prisma.InputJsonValue;
  actions?: string[];
  priority?: number;
}

export interface UpdatePolicyInput {
  name?: string;
  description?: string;
  effect?: PolicyEffect;
  resourceTypes?: ResourceType[];
  resourceIds?: string[];
  conditions?: Prisma.InputJsonValue;
  actions?: string[];
  priority?: number;
  isActive?: boolean;
}

export interface CreateGroupInput {
  teamId: string;
  name: string;
  description?: string;
  groupType?: string;
  parentGroupId?: string;
  isAutoAssign?: boolean;
  autoAssignRules?: Prisma.InputJsonValue;
}

export interface UpdateGroupInput {
  name?: string;
  description?: string;
  isAutoAssign?: boolean;
  autoAssignRules?: Prisma.InputJsonValue;
  isActive?: boolean;
}

export interface GrantPermissionInput {
  teamId: string;
  resourceType: ResourceType;
  resourceId: string;
  granteeType: AssigneeType;
  granteeId: string;
  permissions: string[];
  grantedBy: string;
  expiresAt?: Date;
}

// ============================================================================
// Permission Policy Mutations
// ============================================================================

/**
 * Create a permission policy
 */
export const createPermissionPolicy = async (
  db: Database,
  data: CreatePolicyInput
): Promise<PermissionPolicy> =>
  db.permissionPolicy.create({
    data: {
      teamId: data.teamId,
      name: data.name,
      description: data.description,
      effect: data.effect ?? "ALLOW",
      resourceTypes: data.resourceTypes ?? [],
      resourceIds: data.resourceIds ?? [],
      conditions: data.conditions ?? {},
      actions: data.actions ?? [],
      priority: data.priority ?? 100,
    },
  });

/**
 * Update a permission policy
 */
export const updatePermissionPolicy = async (
  db: Database,
  policyId: string,
  data: UpdatePolicyInput
): Promise<PermissionPolicy> =>
  db.permissionPolicy.update({
    where: { id: policyId },
    data,
  });

/**
 * Delete a permission policy
 */
export const deletePermissionPolicy = async (
  db: Database,
  policyId: string
): Promise<PermissionPolicy> =>
  db.permissionPolicy.delete({
    where: { id: policyId },
  });

/**
 * Assign policy to user/group/role
 */
export const createPolicyAssignment = async (
  db: Database,
  data: {
    policyId: string;
    assigneeType: AssigneeType;
    assigneeId: string;
    scopeType?: string;
    scopeId?: string;
    expiresAt?: Date;
    createdBy: string;
  }
): Promise<PolicyAssignment> => db.policyAssignment.create({ data });

/**
 * Remove policy assignment
 */
export const deletePolicyAssignment = async (
  db: Database,
  assignmentId: string
): Promise<PolicyAssignment> =>
  db.policyAssignment.delete({
    where: { id: assignmentId },
  });

// ============================================================================
// Permission Group Mutations
// ============================================================================

/**
 * Create a permission group
 */
export const createPermissionGroup = async (
  db: Database,
  data: CreateGroupInput
): Promise<PermissionGroup> =>
  db.permissionGroup.create({
    data: {
      teamId: data.teamId,
      name: data.name,
      description: data.description,
      groupType: data.groupType ?? "custom",
      parentGroupId: data.parentGroupId,
      isAutoAssign: data.isAutoAssign ?? false,
      autoAssignRules: data.autoAssignRules ?? {},
    },
  });

/**
 * Update a permission group
 */
export const updatePermissionGroup = async (
  db: Database,
  groupId: string,
  data: UpdateGroupInput
): Promise<PermissionGroup> =>
  db.permissionGroup.update({
    where: { id: groupId },
    data,
  });

/**
 * Delete a permission group
 */
export const deletePermissionGroup = async (
  db: Database,
  groupId: string
): Promise<PermissionGroup> =>
  db.permissionGroup.delete({
    where: { id: groupId },
  });

/**
 * Add member to group
 */
export const addGroupMember = async (
  db: Database,
  data: {
    groupId: string;
    userId: string;
    role?: string;
    addedBy?: string;
    addedVia?: string;
    expiresAt?: Date;
  }
): Promise<GroupMember> => {
  // Update member count
  await db.permissionGroup.update({
    where: { id: data.groupId },
    data: { memberCount: { increment: 1 } },
  });

  return db.groupMember.create({
    data: {
      groupId: data.groupId,
      userId: data.userId,
      role: data.role ?? "member",
      addedBy: data.addedBy,
      addedVia: data.addedVia ?? "manual",
      expiresAt: data.expiresAt,
    },
  });
};

/**
 * Remove member from group
 */
export const removeGroupMember = async (
  db: Database,
  groupId: string,
  userId: string
): Promise<boolean> => {
  try {
    await db.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });

    // Update member count
    await db.permissionGroup.update({
      where: { id: groupId },
      data: { memberCount: { decrement: 1 } },
    });

    return true;
  } catch {
    return false;
  }
};

// ============================================================================
// Resource Permission Mutations
// ============================================================================

/**
 * Grant permission on a resource
 */
export const grantResourcePermission = async (
  db: Database,
  data: GrantPermissionInput
): Promise<ResourcePermission> =>
  db.resourcePermission.upsert({
    where: {
      resourceType_resourceId_granteeType_granteeId: {
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        granteeType: data.granteeType,
        granteeId: data.granteeId,
      },
    },
    create: {
      teamId: data.teamId,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      granteeType: data.granteeType,
      granteeId: data.granteeId,
      permissions: data.permissions,
      grantedBy: data.grantedBy,
      expiresAt: data.expiresAt,
    },
    update: {
      permissions: data.permissions,
      expiresAt: data.expiresAt,
    },
  });

/**
 * Revoke permission on a resource
 */
export const revokeResourcePermission = async (
  db: Database,
  resourceType: ResourceType,
  resourceId: string,
  granteeType: AssigneeType,
  granteeId: string
): Promise<boolean> => {
  try {
    await db.resourcePermission.delete({
      where: {
        resourceType_resourceId_granteeType_granteeId: {
          resourceType,
          resourceId,
          granteeType,
          granteeId,
        },
      },
    });
    return true;
  } catch {
    return false;
  }
};

// ============================================================================
// Access Audit Log Mutations
// ============================================================================

/**
 * Log access event
 */
export const logAccessEvent = async (
  db: Database,
  data: {
    teamId: string;
    userId?: string;
    userEmail?: string;
    actorType?: string;
    actorId?: string;
    eventType: AccessEventType;
    action: string;
    resourceType?: string;
    resourceId?: string;
    resourceName?: string;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    success?: boolean;
    errorCode?: string;
    errorMessage?: string;
    metadata?: Prisma.InputJsonValue;
  }
): Promise<void> => {
  await db.accessAuditLog.create({
    data: {
      teamId: data.teamId,
      userId: data.userId,
      userEmail: data.userEmail,
      actorType: data.actorType ?? "user",
      actorId: data.actorId,
      eventType: data.eventType,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      resourceName: data.resourceName,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      sessionId: data.sessionId,
      success: data.success ?? true,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      metadata: data.metadata ?? {},
    },
  });
};
