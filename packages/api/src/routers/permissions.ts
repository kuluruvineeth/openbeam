/**
 * Permissions Router
 * Advanced access control with policies, groups, and audit trails
 */

import {
  addGroupMember,
  createPermissionGroup,
  createPermissionPolicy,
  createPolicyAssignment,
  deletePermissionGroup,
  deletePermissionPolicy,
  deletePolicyAssignment,
  getPermissionGroupById,
  getPermissionGroupByName,
  getPolicyById,
  getPolicyByName,
  getResourcePermissions,
  getUserPermissionGroups,
  grantResourcePermission,
  listAccessAuditLogs,
  listPermissionGroups,
  listPermissionPolicies,
  removeGroupMember,
  revokeResourcePermission,
  updatePermissionGroup,
  updatePermissionPolicy,
} from "@openplane/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "..";
import { withActiveTeam, withAdmin } from "../middleware";

// ============================================================================
// Schemas
// ============================================================================

const resourceTypeEnum = z.enum([
  "DOCUMENT",
  "CONNECTOR",
  "PROJECT",
  "FOLDER",
  "CHANNEL",
  "ASSISTANT",
  "TOOL",
  "TEAM",
  "WORKSPACE",
]);

const assigneeTypeEnum = z.enum(["USER", "GROUP", "ROLE", "TEAM"]);

// Policy schemas
const listPoliciesSchema = z.object({
  resourceType: resourceTypeEnum.optional(),
  isActive: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const createPolicySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  effect: z.enum(["ALLOW", "DENY"]).default("ALLOW"),
  resourceTypes: z.array(resourceTypeEnum).default([]),
  resourceIds: z.array(z.string()).default([]),
  conditions: z.record(z.unknown()).default({}),
  actions: z.array(z.string()).default([]),
  priority: z.number().min(1).max(1000).default(100),
});

const updatePolicySchema = z.object({
  policyId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  effect: z.enum(["ALLOW", "DENY"]).optional(),
  resourceTypes: z.array(resourceTypeEnum).optional(),
  resourceIds: z.array(z.string()).optional(),
  conditions: z.record(z.unknown()).optional(),
  actions: z.array(z.string()).optional(),
  priority: z.number().min(1).max(1000).optional(),
  isActive: z.boolean().optional(),
});

const assignPolicySchema = z.object({
  policyId: z.string(),
  assigneeType: assigneeTypeEnum,
  assigneeId: z.string(),
  scopeType: z.string().optional(),
  scopeId: z.string().optional(),
  expiresAt: z.date().optional(),
});

// Group schemas
const listGroupsSchema = z.object({
  groupType: z.string().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  groupType: z.string().max(50).default("custom"),
  parentGroupId: z.string().optional(),
  isAutoAssign: z.boolean().default(false),
  autoAssignRules: z.record(z.unknown()).default({}),
});

const updateGroupSchema = z.object({
  groupId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isAutoAssign: z.boolean().optional(),
  autoAssignRules: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

const addMemberSchema = z.object({
  groupId: z.string(),
  userId: z.string(),
  role: z.enum(["member", "admin", "owner"]).default("member"),
  expiresAt: z.date().optional(),
});

// Resource permission schemas
const grantPermissionSchema = z.object({
  resourceType: resourceTypeEnum,
  resourceId: z.string(),
  granteeType: assigneeTypeEnum,
  granteeId: z.string(),
  permissions: z.array(z.string()),
  expiresAt: z.date().optional(),
});

const revokePermissionSchema = z.object({
  resourceType: resourceTypeEnum,
  resourceId: z.string(),
  granteeType: assigneeTypeEnum,
  granteeId: z.string(),
});

// Audit log schema
const listAuditLogsSchema = z.object({
  userId: z.string().optional(),
  eventType: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// ============================================================================
// Router
// ============================================================================

export const permissionsRouter = createTRPCRouter({
  // ==========================================================================
  // Policies
  // ==========================================================================

  /**
   * List permission policies
   */
  listPolicies: withActiveTeam
    .input(listPoliciesSchema)
    .query(async ({ ctx, input }) => {
      const result = await listPermissionPolicies(ctx.prisma, ctx.teamId, {
        resourceType: input.resourceType,
        isActive: input.isActive,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        policies: result.policies,
        pagination: {
          limit: input.limit,
          offset: input.offset,
          total: result.total,
          hasMore: input.offset + result.policies.length < result.total,
        },
      };
    }),

  /**
   * Get policy by ID
   */
  getPolicy: withActiveTeam
    .input(z.object({ policyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const policy = await getPolicyById(
        ctx.prisma,
        input.policyId,
        ctx.teamId
      );

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Policy not found",
        });
      }

      return policy;
    }),

  /**
   * Create a policy (Admin only)
   */
  createPolicy: withAdmin
    .input(createPolicySchema)
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate name
      const existing = await getPolicyByName(
        ctx.prisma,
        ctx.teamId,
        input.name
      );

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Policy with this name already exists",
        });
      }

      return createPermissionPolicy(ctx.prisma, {
        teamId: ctx.teamId,
        ...input,
      });
    }),

  /**
   * Update a policy (Admin only)
   */
  updatePolicy: withAdmin
    .input(updatePolicySchema)
    .mutation(async ({ ctx, input }) => {
      const policy = await getPolicyById(
        ctx.prisma,
        input.policyId,
        ctx.teamId
      );

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Policy not found",
        });
      }

      const { policyId, ...data } = input;

      return updatePermissionPolicy(ctx.prisma, policyId, data);
    }),

  /**
   * Delete a policy (Admin only)
   */
  deletePolicy: withAdmin
    .input(z.object({ policyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const policy = await getPolicyById(
        ctx.prisma,
        input.policyId,
        ctx.teamId
      );

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Policy not found",
        });
      }

      await deletePermissionPolicy(ctx.prisma, input.policyId);

      return { success: true };
    }),

  /**
   * Assign policy to user/group/role (Admin only)
   */
  assignPolicy: withAdmin
    .input(assignPolicySchema)
    .mutation(async ({ ctx, input }) => {
      const policy = await getPolicyById(
        ctx.prisma,
        input.policyId,
        ctx.teamId
      );

      if (!policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Policy not found",
        });
      }

      return createPolicyAssignment(ctx.prisma, {
        policyId: input.policyId,
        assigneeType: input.assigneeType,
        assigneeId: input.assigneeId,
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        expiresAt: input.expiresAt,
        createdBy: ctx.session.user.id,
      });
    }),

  /**
   * Remove policy assignment (Admin only)
   */
  unassignPolicy: withAdmin
    .input(z.object({ assignmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deletePolicyAssignment(ctx.prisma, input.assignmentId);
      return { success: true };
    }),

  // ==========================================================================
  // Groups
  // ==========================================================================

  /**
   * List permission groups
   */
  listGroups: withActiveTeam
    .input(listGroupsSchema)
    .query(async ({ ctx, input }) => {
      const result = await listPermissionGroups(ctx.prisma, ctx.teamId, {
        groupType: input.groupType,
        isActive: input.isActive,
        search: input.search,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        groups: result.groups,
        pagination: {
          limit: input.limit,
          offset: input.offset,
          total: result.total,
          hasMore: input.offset + result.groups.length < result.total,
        },
      };
    }),

  /**
   * Get group by ID with members
   */
  getGroup: withActiveTeam
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const group = await getPermissionGroupById(
        ctx.prisma,
        input.groupId,
        ctx.teamId
      );

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      return group;
    }),

  /**
   * Get current user's groups
   */
  myGroups: withActiveTeam.query(async ({ ctx }) =>
    getUserPermissionGroups(ctx.prisma, ctx.session.user.id, ctx.teamId)
  ),

  /**
   * Create a group (Admin only)
   */
  createGroup: withAdmin
    .input(createGroupSchema)
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate name
      const existing = await getPermissionGroupByName(
        ctx.prisma,
        ctx.teamId,
        input.name
      );

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Group with this name already exists",
        });
      }

      return createPermissionGroup(ctx.prisma, {
        teamId: ctx.teamId,
        ...input,
      });
    }),

  /**
   * Update a group (Admin only)
   */
  updateGroup: withAdmin
    .input(updateGroupSchema)
    .mutation(async ({ ctx, input }) => {
      const group = await getPermissionGroupById(
        ctx.prisma,
        input.groupId,
        ctx.teamId
      );

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      const { groupId, ...data } = input;

      return updatePermissionGroup(ctx.prisma, groupId, data);
    }),

  /**
   * Delete a group (Admin only)
   */
  deleteGroup: withAdmin
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const group = await getPermissionGroupById(
        ctx.prisma,
        input.groupId,
        ctx.teamId
      );

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      await deletePermissionGroup(ctx.prisma, input.groupId);

      return { success: true };
    }),

  /**
   * Add member to group (Admin only)
   */
  addMember: withAdmin
    .input(addMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const group = await getPermissionGroupById(
        ctx.prisma,
        input.groupId,
        ctx.teamId
      );

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      return addGroupMember(ctx.prisma, {
        groupId: input.groupId,
        userId: input.userId,
        role: input.role,
        addedBy: ctx.session.user.id,
        addedVia: "manual",
        expiresAt: input.expiresAt,
      });
    }),

  /**
   * Remove member from group (Admin only)
   */
  removeMember: withAdmin
    .input(z.object({ groupId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const group = await getPermissionGroupById(
        ctx.prisma,
        input.groupId,
        ctx.teamId
      );

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      const success = await removeGroupMember(
        ctx.prisma,
        input.groupId,
        input.userId
      );

      return { success };
    }),

  // ==========================================================================
  // Resource Permissions
  // ==========================================================================

  /**
   * Get permissions for a resource
   */
  getResourcePermissions: withActiveTeam
    .input(z.object({ resourceType: resourceTypeEnum, resourceId: z.string() }))
    .query(async ({ ctx, input }) =>
      getResourcePermissions(
        ctx.prisma,
        input.resourceType,
        input.resourceId,
        ctx.teamId
      )
    ),

  /**
   * Grant permission on a resource (Admin only)
   */
  grantPermission: withAdmin
    .input(grantPermissionSchema)
    .mutation(async ({ ctx, input }) =>
      grantResourcePermission(ctx.prisma, {
        teamId: ctx.teamId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        granteeType: input.granteeType,
        granteeId: input.granteeId,
        permissions: input.permissions,
        grantedBy: ctx.session.user.id,
        expiresAt: input.expiresAt,
      })
    ),

  /**
   * Revoke permission on a resource (Admin only)
   */
  revokePermission: withAdmin
    .input(revokePermissionSchema)
    .mutation(async ({ ctx, input }) => {
      const success = await revokeResourcePermission(
        ctx.prisma,
        input.resourceType,
        input.resourceId,
        input.granteeType,
        input.granteeId
      );

      return { success };
    }),

  // ==========================================================================
  // Audit Logs (Admin only)
  // ==========================================================================

  /**
   * List access audit logs
   */
  listAuditLogs: withAdmin
    .input(listAuditLogsSchema)
    .query(async ({ ctx, input }) => {
      const result = await listAccessAuditLogs(ctx.prisma, ctx.teamId, {
        userId: input.userId,
        eventType: input.eventType,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        startDate: input.startDate,
        endDate: input.endDate,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        logs: result.logs,
        pagination: {
          limit: input.limit,
          offset: input.offset,
          total: result.total,
          hasMore: input.offset + result.logs.length < result.total,
        },
      };
    }),
});
