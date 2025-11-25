/**
 * Tools Router
 * MCP-compatible tool management for connectors
 */

import {
  createTool,
  deleteTool,
  getToolById,
  getToolCategories,
  listToolsByTeam,
  toggleToolEnabled,
  toolExistsByName,
  updateTool,
  verifyConnectorOwnership,
} from "@openplane/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { withActiveTeam } from "./middleware";

// ============================================================================
// Schemas
// ============================================================================

const listToolsSchema = z.object({
  connectorId: z.string().optional(),
  category: z.string().optional(),
  enabled: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const createToolSchema = z.object({
  connectorId: z.string(),
  toolName: z.string().min(1).max(100),
  displayName: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  toolSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()).optional(),
  config: z.record(z.unknown()).default({}),
  requiredPermissions: z.array(z.string()).default([]),
  enabled: z.boolean().default(false),
});

const updateToolSchema = z.object({
  toolId: z.string(),
  displayName: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  toolSchema: z.record(z.unknown()).optional(),
  outputSchema: z.record(z.unknown()).optional().nullable(),
  config: z.record(z.unknown()).optional(),
  requiredPermissions: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  rateLimitPerMinute: z.number().min(1).optional().nullable(),
  rateLimitPerHour: z.number().min(1).optional().nullable(),
});

// ============================================================================
// Router
// ============================================================================

export const toolsRouter = createTRPCRouter({
  /**
   * List tools for team or connector
   */
  list: withActiveTeam.input(listToolsSchema).query(async ({ ctx, input }) => {
    const result = await listToolsByTeam(ctx.prisma, ctx.teamId, {
      connectorId: input.connectorId,
      category: input.category,
      enabled: input.enabled,
      limit: input.limit,
      offset: input.offset,
    });

    return {
      tools: result.tools,
      pagination: {
        limit: input.limit,
        offset: input.offset,
        total: result.total,
        hasMore: input.offset + result.tools.length < result.total,
      },
    };
  }),

  /**
   * Get tool by ID
   */
  get: withActiveTeam
    .input(z.object({ toolId: z.string() }))
    .query(async ({ ctx, input }) => {
      const tool = await getToolById(ctx.prisma, input.toolId, ctx.teamId);

      if (!tool) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tool not found or unauthorized",
        });
      }

      return tool;
    }),

  /**
   * Create a new tool
   */
  create: withActiveTeam
    .input(createToolSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify connector access
      const connector = await verifyConnectorOwnership(
        ctx.prisma,
        input.connectorId,
        ctx.teamId
      );

      if (!connector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connector not found or unauthorized",
        });
      }

      // Check for duplicate tool name
      const exists = await toolExistsByName(
        ctx.prisma,
        ctx.teamId,
        input.connectorId,
        input.toolName
      );

      if (exists) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Tool with this name already exists for this connector",
        });
      }

      return createTool(ctx.prisma, {
        teamId: ctx.teamId,
        connectorId: input.connectorId,
        toolName: input.toolName,
        displayName: input.displayName,
        description: input.description,
        category: input.category,
        toolSchema: input.toolSchema,
        outputSchema: input.outputSchema,
        config: input.config,
        requiredPermissions: input.requiredPermissions,
        enabled: input.enabled,
      });
    }),

  /**
   * Update a tool
   */
  update: withActiveTeam
    .input(updateToolSchema)
    .mutation(async ({ ctx, input }) => {
      const tool = await getToolById(ctx.prisma, input.toolId, ctx.teamId);

      if (!tool) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tool not found or unauthorized",
        });
      }

      const { toolId, ...data } = input;

      return updateTool(ctx.prisma, toolId, data);
    }),

  /**
   * Delete a tool
   */
  delete: withActiveTeam
    .input(z.object({ toolId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tool = await getToolById(ctx.prisma, input.toolId, ctx.teamId);

      if (!tool) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tool not found or unauthorized",
        });
      }

      await deleteTool(ctx.prisma, input.toolId);

      return { success: true };
    }),

  /**
   * Toggle tool enabled status
   */
  toggle: withActiveTeam
    .input(z.object({ toolId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tool = await getToolById(ctx.prisma, input.toolId, ctx.teamId);

      if (!tool) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tool not found or unauthorized",
        });
      }

      return toggleToolEnabled(ctx.prisma, input.toolId, tool.enabled);
    }),

  /**
   * Get tool categories
   */
  categories: withActiveTeam.query(async ({ ctx }) =>
    getToolCategories(ctx.prisma, ctx.teamId)
  ),
});
