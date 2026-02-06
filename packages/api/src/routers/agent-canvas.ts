import {
  type CanvasStreamEvent,
  createEmptyState,
  createGetToolParameters,
  registerAllTools,
  streamCanvasBuilder,
  toolRegistry,
  toToolPickerItems,
} from "@openplane/ai";
import {
  archiveAgentCanvas,
  createAgentCanvas,
  deleteAgentCanvas,
  duplicateAgentCanvas,
  findAgentCanvasById,
  findAgentCanvasExecution,
  findAgentCanvasVersion,
  findApprovalWithExecutionAuth,
  findPendingApproval,
  listAgentCanvasExecutions,
  listAgentCanvases,
  listAgentCanvasTemplates,
  listAgentCanvasVersions,
  listPendingApprovals,
  publishAgentCanvas,
  respondToApproval,
  updateAgentCanvas,
} from "@openplane/db";
import { createExecutionAndStartCanvasWorkflow } from "@openplane/orchestrations";
import { createExecutionEventSubscriber, rateLimiter } from "@openplane/redis";
import { logger } from "@openplane/services/lib/logger";
import { submitCanvasApproval, submitCanvasInput } from "@openplane/temporal";
import {
  AgentCanvasEdgeSchema,
  AgentCanvasNodeSchema,
  AgentCanvasSettingsSchema,
  CanvasStateSchema,
  CanvasTriggerSettingsSchema,
  InputNodeConfigSchema,
  ViewportSchema,
} from "@openplane/types/canvas";
import type { ExecutionEvent } from "@openplane/types/canvas/execution-events";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import {
  normalizeInputValues,
  resolveNodeConfig,
} from "../utils/input-normalization";
import { withActiveTeam, withAdminRole } from "./apps/middleware";

const EXECUTIONS_PER_HOUR = 100;
const ONE_HOUR_SECONDS = 3600;

const AgentCanvasStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

function canUserInteractWithExecution(
  userId: string,
  execution: {
    triggeredById: string;
    agentCanvas: { createdById: string } | null;
  }
): boolean {
  return (
    execution.triggeredById === userId ||
    execution.agentCanvas?.createdById === userId
  );
}
const AgentTriggerTypeSchema = z.enum([
  "MANUAL",
  "SCHEDULE",
  "WEBHOOK",
  "EVENT",
]);

const listCanvasesSchema = z.object({
  status: AgentCanvasStatusSchema.optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  cursor: z.number().nullish(),
});

const canvasIdSchema = z.object({
  canvasId: z.string(),
});

const duplicateCanvasSchema = z.object({
  canvasId: z.string(),
  name: z.string().min(1).max(100).optional(),
});

const createCanvasSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  nodes: z.array(AgentCanvasNodeSchema),
  edges: z.array(AgentCanvasEdgeSchema),
  viewport: ViewportSchema.optional(),
  settings: AgentCanvasSettingsSchema.optional(),
  triggerType: AgentTriggerTypeSchema.optional(),
  triggerConfig: CanvasTriggerSettingsSchema.optional(),
});

const updateCanvasSchema = z.object({
  canvasId: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().optional(),
  nodes: z.array(AgentCanvasNodeSchema).optional(),
  edges: z.array(AgentCanvasEdgeSchema).optional(),
  viewport: ViewportSchema.optional(),
  settings: AgentCanvasSettingsSchema.optional(),
  triggerType: AgentTriggerTypeSchema.optional(),
  triggerConfig: CanvasTriggerSettingsSchema.optional(),
});

const publishCanvasSchema = z.object({
  canvasId: z.string(),
  changelog: z.string().max(1000).optional(),
});

const listExecutionsSchema = z.object({
  canvasId: z.string(),
  status: z
    .enum([
      "PENDING",
      "RUNNING",
      "WAITING_APPROVAL",
      "WAITING_INPUT",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
      "TIMED_OUT",
    ])
    .optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const executionIdSchema = z.object({
  executionId: z.string(),
});

const createExecutionSchema = z.object({
  canvasId: z.string(),
  input: z.unknown().optional(),
  triggerSource: z.string().optional(),
});

const approvalResponseSchema = z.object({
  approvalId: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
  responseMessage: z.string().max(500).optional(),
});

const pendingApprovalSchema = z.object({
  executionId: z.string(),
  nodeId: z.string(),
});

const submitInputSchema = z.object({
  executionId: z.string(),
  nodeId: z.string(),
  values: z.record(z.string(), z.unknown()).optional(),
  skipped: z.boolean().optional(),
});

const listTemplatesSchema = z.object({
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const buildCanvasSchema = z.object({
  prompt: z.string().min(1).max(10_000),
  canvasId: z.string().optional(),
  sessionId: z.string().optional(),
});

async function verifyCanvasAccess(
  prisma: Parameters<typeof findAgentCanvasById>[0],
  canvasId: string,
  teamId: string
) {
  const canvas = await findAgentCanvasById(prisma, canvasId, teamId);

  if (!canvas) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Agent canvas not found",
    });
  }

  return canvas;
}

async function getCanvasVersion(
  prisma: Parameters<typeof findAgentCanvasVersion>[0],
  agentCanvasId: string,
  versionNumber: number
) {
  const version = await findAgentCanvasVersion(
    prisma,
    agentCanvasId,
    versionNumber
  );

  if (!version) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Canvas version not found",
    });
  }

  return version;
}

function parseCanvasState(version: {
  nodes: unknown;
  edges: unknown;
  viewport: unknown;
}) {
  try {
    return CanvasStateSchema.parse({
      nodes: version.nodes,
      edges: version.edges,
      viewport: version.viewport ?? undefined,
    });
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Invalid canvas state in version",
      cause: error,
    });
  }
}

function findInputNode(nodes: unknown[], nodeId: string) {
  const nodeArray = z.array(AgentCanvasNodeSchema).parse(nodes);
  const node = nodeArray.find((item) => item.id === nodeId);

  if (!node || node.type !== "input") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Input node not found",
    });
  }

  return node;
}

async function handleSkippedInput(
  workflowId: string,
  nodeId: string,
  executionId: string,
  userId: string
) {
  const signaled = await submitCanvasInput({
    workflowId,
    payload: {
      nodeId,
      skipped: true,
      submittedById: userId,
      executionId,
      timestamp: Date.now(),
    },
  });

  if (!signaled) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Execution workflow not found",
    });
  }

  return { success: true };
}

async function handleInputValues(params: {
  workflowId: string;
  nodeId: string;
  executionId: string;
  userId: string;
  config: z.infer<typeof InputNodeConfigSchema>;
  values: Record<string, unknown>;
}) {
  const normalized = normalizeInputValues(params.config, params.values);

  if (normalized.errors.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: normalized.errors.join("; "),
    });
  }

  const signaled = await submitCanvasInput({
    workflowId: params.workflowId,
    payload: {
      nodeId: params.nodeId,
      values: normalized.values,
      skipped: false,
      submittedById: params.userId,
      executionId: params.executionId,
      timestamp: Date.now(),
    },
  });

  if (!signaled) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Execution workflow not found",
    });
  }

  return { success: true };
}

export const agentCanvasRouter = createTRPCRouter({
  list: withActiveTeam
    .input(listCanvasesSchema)
    .query(async ({ ctx, input }) => {
      const effectiveOffset = input.cursor ?? input.offset;

      const items = await listAgentCanvases(ctx.prisma, ctx.teamId, {
        status: input.status,
        limit: input.limit + 1,
        offset: effectiveOffset,
      });

      const hasMore = items.length > input.limit;
      const canvases = hasMore ? items.slice(0, -1) : items;
      const nextCursor = hasMore
        ? effectiveOffset + canvases.length
        : undefined;

      const total = hasMore
        ? effectiveOffset + input.limit + 1
        : effectiveOffset + canvases.length;

      return {
        items: canvases,
        total,
        hasMore,
        nextOffset: nextCursor,
        nextCursor,
      };
    }),

  get: withActiveTeam
    .input(canvasIdSchema)
    .query(async ({ ctx, input }) =>
      verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId)
    ),

  create: withActiveTeam
    .input(createCanvasSchema)
    .mutation(async ({ ctx, input }) =>
      createAgentCanvas(ctx.prisma, {
        name: input.name,
        description: input.description,
        icon: input.icon,
        nodes: input.nodes,
        edges: input.edges,
        viewport: input.viewport,
        settings: input.settings,
        triggerType: input.triggerType,
        triggerConfig: input.triggerConfig,
        teamId: ctx.teamId,
        createdById: ctx.session.user.id,
      })
    ),

  update: withActiveTeam
    .input(updateCanvasSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);

      return updateAgentCanvas(ctx.prisma, input.canvasId, ctx.teamId, {
        name: input.name,
        description: input.description,
        icon: input.icon,
        nodes: input.nodes,
        edges: input.edges,
        viewport: input.viewport,
        settings: input.settings,
        triggerType: input.triggerType,
        triggerConfig: input.triggerConfig,
      });
    }),

  publish: withAdminRole
    .input(publishCanvasSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);
      return publishAgentCanvas(ctx.prisma, input.canvasId, ctx.teamId, {
        publishedById: ctx.session.user.id,
        changelog: input.changelog,
      });
    }),

  archive: withAdminRole
    .input(canvasIdSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);
      await archiveAgentCanvas(ctx.prisma, input.canvasId, ctx.teamId);
      return { success: true };
    }),

  delete: withAdminRole
    .input(canvasIdSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);

      const result = await deleteAgentCanvas(
        ctx.prisma,
        input.canvasId,
        ctx.teamId
      );

      if (result.count === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent canvas not found",
        });
      }

      return { success: true };
    }),

  duplicate: withActiveTeam
    .input(duplicateCanvasSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);

      return duplicateAgentCanvas(ctx.prisma, input.canvasId, ctx.teamId, {
        name: input.name,
        createdById: ctx.session.user.id,
      });
    }),

  listExecutions: withActiveTeam
    .input(listExecutionsSchema)
    .query(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);

      const items = await listAgentCanvasExecutions(
        ctx.prisma,
        input.canvasId,
        {
          status: input.status,
          limit: input.limit + 1,
          offset: input.offset,
        }
      );

      const hasMore = items.length > input.limit;
      const executions = hasMore ? items.slice(0, -1) : items;

      return {
        items: executions,
        hasMore,
        nextOffset: hasMore ? input.offset + executions.length : undefined,
      };
    }),

  getExecution: withActiveTeam
    .input(executionIdSchema)
    .query(async ({ ctx, input }) => {
      const execution = await findAgentCanvasExecution(
        ctx.prisma,
        input.executionId,
        ctx.teamId
      );

      if (!execution) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Execution not found",
        });
      }

      return execution;
    }),

  onExecutionEvent: withActiveTeam
    .input(executionIdSchema)
    .subscription(async function* ({
      ctx,
      input,
      signal,
    }): AsyncGenerator<ExecutionEvent> {
      const execution = await findAgentCanvasExecution(
        ctx.prisma,
        input.executionId,
        ctx.teamId
      );

      if (!execution) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Execution not found",
        });
      }

      if (!canUserInteractWithExecution(ctx.session.user.id, execution)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this execution",
        });
      }

      const queue: ExecutionEvent[] = [];
      let resolve: (() => void) | null = null;

      const unsubscribe = await createExecutionEventSubscriber(
        input.executionId,
        (event) => {
          queue.push(event);
          resolve?.();
        }
      );

      let cleanedUp = false;
      const cleanup = async () => {
        if (!cleanedUp) {
          cleanedUp = true;
          await unsubscribe();
        }
      };

      try {
        signal?.addEventListener("abort", cleanup, { once: true });

        yield {
          type: "connected",
          timestamp: Date.now(),
        };

        while (!signal?.aborted) {
          if (queue.length === 0) {
            await new Promise<void>((r) => {
              resolve = r;
              signal?.addEventListener("abort", () => r(), { once: true });
            });
          }

          if (signal?.aborted) {
            break;
          }

          while (queue.length > 0) {
            const event = queue.shift();
            if (event) {
              yield event;

              if (
                event.type === "execution.completed" ||
                event.type === "execution.failed" ||
                event.type === "execution.cancelled"
              ) {
                return;
              }
            }
          }
        }
      } finally {
        await cleanup();
      }
    }),

  getExecutionCanvas: withActiveTeam
    .input(executionIdSchema)
    .query(async ({ ctx, input }) => {
      const execution = await findAgentCanvasExecution(
        ctx.prisma,
        input.executionId,
        ctx.teamId
      );

      if (!execution) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Execution not found",
        });
      }

      const version = await findAgentCanvasVersion(
        ctx.prisma,
        execution.agentCanvasId,
        execution.versionNumber
      );

      if (!version) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Canvas version not found",
        });
      }

      let canvasState: z.infer<typeof CanvasStateSchema>;
      try {
        canvasState = CanvasStateSchema.parse({
          nodes: version.nodes,
          edges: version.edges,
          viewport: version.viewport ?? undefined,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid canvas state in version",
          cause: error,
        });
      }

      return {
        executionId: execution.id,
        agentCanvasId: execution.agentCanvasId,
        versionNumber: execution.versionNumber,
        nodes: canvasState.nodes,
        edges: canvasState.edges,
        viewport: canvasState.viewport,
        settings: version.settings ?? undefined,
      };
    }),

  createExecution: withActiveTeam
    .input(createExecutionSchema)
    .mutation(async ({ ctx, input }) => {
      const allowed = await rateLimiter.checkLimit(
        `api:createExecution:team:${ctx.teamId}`,
        EXECUTIONS_PER_HOUR,
        ONE_HOUR_SECONDS
      );

      if (!allowed) {
        logger.warn(
          { teamId: ctx.teamId, userId: ctx.session.user.id },
          "Rate limit exceeded for canvas execution"
        );
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Rate limit exceeded. Maximum 100 executions per hour.",
        });
      }

      const canvas = await verifyCanvasAccess(
        ctx.prisma,
        input.canvasId,
        ctx.teamId
      );

      if (canvas.status !== "PUBLISHED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only execute published canvases",
        });
      }

      const [latestVersion] = await listAgentCanvasVersions(
        ctx.prisma,
        input.canvasId,
        { limit: 1 }
      );

      if (!latestVersion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Published version not found",
        });
      }

      let canvasState: z.infer<typeof CanvasStateSchema>;
      try {
        canvasState = CanvasStateSchema.parse({
          nodes: latestVersion.nodes,
          edges: latestVersion.edges,
          viewport: latestVersion.viewport ?? undefined,
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Invalid canvas state in published version",
          cause: error,
        });
      }

      return await createExecutionAndStartCanvasWorkflow({
        prisma: ctx.prisma,
        canvasId: input.canvasId,
        versionNumber: latestVersion.version,
        nodes: canvasState.nodes,
        edges: canvasState.edges,
        viewport: canvasState.viewport,
        input: input.input,
        teamId: ctx.teamId,
        triggeredById: ctx.session.user.id,
        triggerSource: input.triggerSource,
      });
    }),

  getPendingApproval: withActiveTeam
    .input(pendingApprovalSchema)
    .query(async ({ ctx, input }) => {
      const execution = await findAgentCanvasExecution(
        ctx.prisma,
        input.executionId,
        ctx.teamId
      );

      if (!execution) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Execution not found",
        });
      }

      return findPendingApproval(ctx.prisma, input.executionId, input.nodeId);
    }),

  listPendingApprovals: withActiveTeam.query(async ({ ctx }) =>
    listPendingApprovals(ctx.prisma, ctx.teamId)
  ),

  respondToApproval: withActiveTeam
    .input(approvalResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const approvalWithAuth = await findApprovalWithExecutionAuth(
        ctx.prisma,
        input.approvalId,
        ctx.teamId
      );

      if (!approvalWithAuth) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Approval not found",
        });
      }

      if (
        !canUserInteractWithExecution(ctx.session.user.id, {
          triggeredById: approvalWithAuth.execution.triggeredById,
          agentCanvas: approvalWithAuth.execution.agentCanvas,
        })
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to respond to this approval",
        });
      }

      const approval = await respondToApproval(
        ctx.prisma,
        input.approvalId,
        ctx.teamId,
        {
          status: input.status,
          responseMessage: input.responseMessage,
          respondedById: ctx.session.user.id,
        }
      );

      if (approval.nodeId && approvalWithAuth.execution.workflowId) {
        const signalStatus =
          approval.status === "APPROVED" || approval.status === "REJECTED"
            ? approval.status
            : undefined;

        if (signalStatus) {
          await submitCanvasApproval({
            workflowId: approvalWithAuth.execution.workflowId,
            payload: {
              approvalId: approval.id,
              nodeId: approval.nodeId,
              status: signalStatus,
              responseMessage: approval.responseMessage ?? undefined,
              respondedById: approval.respondedById ?? undefined,
              executionId: approval.executionId,
              timestamp: Date.now(),
            },
          });
        }
      }

      return approval;
    }),

  submitInput: withActiveTeam
    .input(submitInputSchema)
    .mutation(async ({ ctx, input }) => {
      const execution = await findAgentCanvasExecution(
        ctx.prisma,
        input.executionId,
        ctx.teamId
      );

      if (!execution) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Execution not found",
        });
      }

      if (!canUserInteractWithExecution(ctx.session.user.id, execution)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You do not have permission to submit input to this execution",
        });
      }

      const version = await getCanvasVersion(
        ctx.prisma,
        execution.agentCanvasId,
        execution.versionNumber
      );

      const canvasState = parseCanvasState(version);
      const node = findInputNode(canvasState.nodes, input.nodeId);
      const config = InputNodeConfigSchema.parse(resolveNodeConfig(node.data));

      const workflowId = execution.workflowId;
      if (!workflowId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Execution is not running",
        });
      }

      if (input.skipped) {
        if (!config.allowSkip) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Skipping input is not allowed",
          });
        }

        if (input.values && Object.keys(input.values).length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Skipped input cannot include values",
          });
        }

        return handleSkippedInput(
          workflowId,
          node.id,
          execution.id,
          ctx.session.user.id
        );
      }

      if (!input.values) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Input values are required",
        });
      }

      return handleInputValues({
        workflowId,
        nodeId: node.id,
        executionId: execution.id,
        userId: ctx.session.user.id,
        config,
        values: input.values,
      });
    }),

  listTemplates: withActiveTeam
    .input(listTemplatesSchema)
    .query(async ({ ctx, input }) =>
      listAgentCanvasTemplates(ctx.prisma, {
        teamId: ctx.teamId,
        category: input.category,
        isPublic: input.isPublic,
        limit: input.limit,
        offset: input.offset,
      })
    ),

  listTools: withActiveTeam.query(() => {
    registerAllTools();
    return toToolPickerItems(toolRegistry.getAllMetadata());
  }),

  getToolParameters: withActiveTeam
    .input(z.object({ toolId: z.string() }))
    .query(async ({ input }) => {
      registerAllTools();
      const getParams = createGetToolParameters(toolRegistry);
      return await getParams(input.toolId);
    }),

  buildCanvas: withActiveTeam
    .input(buildCanvasSchema)
    .subscription(async function* ({
      ctx,
      input,
    }): AsyncGenerator<CanvasStreamEvent> {
      let canvasState: { nodes: unknown[]; edges: unknown[] } | undefined;

      if (input.canvasId) {
        const canvas = await findAgentCanvasById(
          ctx.prisma,
          input.canvasId,
          ctx.teamId
        );
        if (canvas) {
          try {
            canvasState = {
              nodes: z.array(AgentCanvasNodeSchema).parse(canvas.nodes),
              edges: z.array(AgentCanvasEdgeSchema).parse(canvas.edges),
            };
          } catch (error) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Invalid canvas state",
              cause: error,
            });
          }
        }
      }

      const agentCtx = {
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
        sessionId: input.sessionId,
        state: createEmptyState(),
        metadata: {
          ...(input.canvasId ? { canvasId: input.canvasId } : {}),
          ...(canvasState ? { canvas: canvasState } : {}),
        },
      };

      for await (const event of streamCanvasBuilder(input.prompt, agentCtx)) {
        yield event;
      }
    }),
});
