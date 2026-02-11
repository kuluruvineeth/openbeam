import {
  createEmptyState,
  createGetToolParameters,
  registerAllTools,
  streamCanvasBuilder,
  toolRegistry,
  toToolPickerItems,
} from "@openplane/ai";
import {
  archiveAgentCanvas,
  archiveSession,
  bindExecutionToSession,
  createAgentCanvas,
  createNewSession,
  createOrGetSession,
  deleteAgentCanvas,
  duplicateAgentCanvas,
  findAgentCanvasById,
  findAgentCanvasExecution,
  findAgentCanvasVersion,
  findApprovalWithExecutionAuth,
  findPendingApproval,
  findSessionById,
  listAgentCanvasExecutions,
  listAgentCanvases,
  listAgentCanvasTemplates,
  listAgentCanvasVersions,
  listPendingApprovals,
  listSessionEvents,
  listSessionEventsAfterSequence,
  listSessions,
  publishAgentCanvas,
  respondToApproval,
  updateAgentCanvas,
  updateSessionTitle,
} from "@openplane/db";
import { createExecutionAndStartCanvasWorkflow } from "@openplane/orchestrations";
import {
  cleanupSessionThrottleCache,
  createExecutionEventSubscriber,
  createSessionRuntimeEventSubscriber,
  rateLimiter,
} from "@openplane/redis";
import { logger } from "@openplane/services/lib/logger";
import { redactToolPayload } from "@openplane/services/policy/redaction-policy";
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
import type { RuntimeEvent } from "@openplane/types/canvas/runtime-events";
import {
  ArchiveSessionInputSchema,
  BuildCanvasInputSchema,
  CreateSessionInputSchema,
  GetOrCreateSessionInputSchema,
  GetSessionEventsInputSchema,
  ListSessionsInputSchema,
  OnSessionEventInputSchema,
} from "@openplane/types/canvas/session";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../index";
import { verifySessionOwnership } from "../middleware/session-auth";
import {
  recordEventYielded,
  recordReplay,
  recordSequenceGap,
  recordSessionStreamConnect,
  recordSessionStreamDisconnect,
} from "../observability/runtime-stream-metrics";
import {
  normalizeInputValues,
  resolveNodeConfig,
} from "../utils/input-normalization";
import {
  appendAndPublishRuntimeEvent,
  isEphemeralEvent,
  mapBuilderEventToPayload,
  publishEphemeralRuntimeEvent,
} from "../utils/runtime-event-mapping";
import { withActiveTeam, withAdminRole } from "./apps/middleware";

const EXECUTIONS_PER_HOUR = 100;
const BUILDS_PER_HOUR = 200;
const ONE_HOUR_SECONDS = 3600;
const CANVAS_STREAM_DEBUG_VALUES = new Set(["1", "true", "yes", "on"]);
const CANVAS_STREAM_DEBUG = CANVAS_STREAM_DEBUG_VALUES.has(
  (process.env.CANVAS_STREAM_DEBUG ?? "").toLowerCase()
);

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
  input: z.record(z.string(), z.unknown()).optional(),
  triggerSource: z.string().optional(),
  sessionId: z.string().optional(),
  turnId: z.string().optional(),
});

const approvalResponseSchema = z.object({
  approvalId: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
  responseMessage: z.string().max(500).optional(),
  sessionId: z.string().optional(),
  canvasId: z.string().optional(),
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
  sessionId: z.string().optional(),
});

const listTemplatesSchema = z.object({
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const buildCanvasSchema = BuildCanvasInputSchema;

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
  const parsed = CanvasStateSchema.safeParse({
    nodes: version.nodes,
    edges: version.edges,
    viewport: version.viewport ?? undefined,
  });

  if (!parsed.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Canvas version contains invalid data",
    });
  }

  return parsed.data;
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

function rebuildConversationHistory(
  events: Array<{ eventType: string; payload: unknown }>
): Array<{ role: "user" | "assistant"; content: string }> {
  const history: Array<{ role: "user" | "assistant"; content: string }> = [];

  const chatPayloadSchema = z
    .object({ content: z.string().optional() })
    .nullable();

  for (const event of events) {
    if (event.eventType === "chat.user_message") {
      const parsed = chatPayloadSchema.safeParse(event.payload);
      if (parsed.success && parsed.data?.content) {
        history.push({ role: "user", content: parsed.data.content });
      }
    } else if (event.eventType === "chat.assistant_final") {
      const parsed = chatPayloadSchema.safeParse(event.payload);
      if (parsed.success && parsed.data?.content) {
        history.push({ role: "assistant", content: parsed.data.content });
      }
    }
  }

  return history;
}

type BuildStreamDiagnostics = {
  startedAt: number;
  builderEventCount: number;
  mappedPayloadCount: number;
  skippedBuilderEventCount: number;
  emittedRuntimeEventCount: number;
  emittedEphemeralEventCount: number;
  emittedPersistedEventCount: number;
  assistantDeltaChars: number;
  assistantFinalChars: number;
  builderEventTypes: Record<string, number>;
  payloadTypes: Record<string, number>;
  canvasOperationTypes: Record<string, number>;
};

function incrementCounter(
  counter: Record<string, number>,
  key: string | undefined
): void {
  if (!key) {
    return;
  }
  counter[key] = (counter[key] ?? 0) + 1;
}

function summarizeUnknownValueShape(value: unknown): Record<string, unknown> {
  if (value === null) {
    return { kind: "null" };
  }

  if (value === undefined) {
    return { kind: "undefined" };
  }

  if (Array.isArray(value)) {
    return { kind: "array", length: value.length };
  }

  if (typeof value === "string") {
    return { kind: "string", length: value.length };
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return { kind: typeof value };
  }

  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    return {
      kind: "object",
      keyCount: keys.length,
      keysPreview: keys.slice(0, 8),
    };
  }

  return { kind: typeof value };
}

function summarizeBuilderEvent(event: unknown): Record<string, unknown> {
  const streamEvent = event as { type?: string };

  if (streamEvent.type === "text") {
    const textEvent = event as { type: "text"; chunk: string };
    return { type: "text", chunkLength: textEvent.chunk.length };
  }

  if (streamEvent.type === "thinking") {
    const thinkingEvent = event as { type: "thinking"; content: string };
    return {
      type: "thinking",
      contentLength: thinkingEvent.content.length,
    };
  }

  if (streamEvent.type === "tool_call") {
    const toolCallEvent = event as {
      type: "tool_call";
      id: string;
      tool: string;
      input: unknown;
    };
    return {
      type: "tool_call",
      toolCallId: toolCallEvent.id,
      toolName: toolCallEvent.tool,
      inputShape: summarizeUnknownValueShape(toolCallEvent.input),
    };
  }

  if (streamEvent.type === "tool_result") {
    const toolResultEvent = event as {
      type: "tool_result";
      id: string;
      result: unknown;
    };
    return {
      type: "tool_result",
      toolCallId: toolResultEvent.id,
      resultShape: summarizeUnknownValueShape(toolResultEvent.result),
    };
  }

  if (streamEvent.type === "canvas_op") {
    const canvasOpEvent = event as {
      type: "canvas_op";
      operation?: { type?: string };
    };
    return {
      type: "canvas_op",
      operationType: canvasOpEvent.operation?.type ?? "unknown",
    };
  }

  if (streamEvent.type === "error") {
    const errorEvent = event as { type: "error"; error?: unknown };
    return {
      type: "error",
      errorShape: summarizeUnknownValueShape(errorEvent.error),
    };
  }

  if (streamEvent.type === "complete") {
    return { type: "complete" };
  }

  return { type: streamEvent.type ?? "unknown" };
}

function createBuildStreamDiagnostics(): BuildStreamDiagnostics {
  return {
    startedAt: performance.now(),
    builderEventCount: 0,
    mappedPayloadCount: 0,
    skippedBuilderEventCount: 0,
    emittedRuntimeEventCount: 0,
    emittedEphemeralEventCount: 0,
    emittedPersistedEventCount: 0,
    assistantDeltaChars: 0,
    assistantFinalChars: 0,
    builderEventTypes: {},
    payloadTypes: {},
    canvasOperationTypes: {},
  };
}

async function loadCanvasState(
  prisma: Parameters<typeof findAgentCanvasById>[0],
  canvasId: string,
  teamId: string
): Promise<{ nodes: unknown[]; edges: unknown[] } | undefined> {
  const canvas = await findAgentCanvasById(prisma, canvasId, teamId);
  if (!canvas) {
    return;
  }

  const nodesResult = z.array(AgentCanvasNodeSchema).safeParse(canvas.nodes);
  const edgesResult = z.array(AgentCanvasEdgeSchema).safeParse(canvas.edges);

  if (!(nodesResult.success && edgesResult.success)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Canvas contains invalid data",
    });
  }

  return { nodes: nodesResult.data, edges: edgesResult.data };
}

function logBuildStreamSummary(params: {
  session: { id: string; agentCanvasId: string };
  teamId: string;
  turnId: string;
  outcome: "completed" | "failed";
  promptLength: number;
  conversationTurnCount: number;
  pendingToolCalls: number;
  errorMessage: string | undefined;
  metrics: BuildStreamDiagnostics;
}) {
  const durationMs = Math.round(performance.now() - params.metrics.startedAt);
  logger.info(
    {
      sessionId: params.session.id,
      canvasId: params.session.agentCanvasId,
      teamId: params.teamId,
      turnId: params.turnId,
      outcome: params.outcome,
      durationMs,
      promptChars: params.promptLength,
      conversationTurnCount: params.conversationTurnCount,
      pendingToolCalls: params.pendingToolCalls,
      streamErrorMessage: params.errorMessage,
      diagnostics: {
        builderEventCount: params.metrics.builderEventCount,
        mappedPayloadCount: params.metrics.mappedPayloadCount,
        skippedBuilderEventCount: params.metrics.skippedBuilderEventCount,
        emittedRuntimeEventCount: params.metrics.emittedRuntimeEventCount,
        emittedEphemeralEventCount: params.metrics.emittedEphemeralEventCount,
        emittedPersistedEventCount: params.metrics.emittedPersistedEventCount,
        assistantDeltaChars: params.metrics.assistantDeltaChars,
        assistantFinalChars: params.metrics.assistantFinalChars,
        builderEventTypes: params.metrics.builderEventTypes,
        payloadTypes: params.metrics.payloadTypes,
        canvasOperationTypes: params.metrics.canvasOperationTypes,
      },
    },
    "Canvas builder stream summary"
  );
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

      const canvasState = CanvasStateSchema.safeParse({
        nodes: version.nodes,
        edges: version.edges,
        viewport: version.viewport ?? undefined,
      });

      if (!canvasState.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Canvas version contains invalid data",
        });
      }

      return {
        executionId: execution.id,
        agentCanvasId: execution.agentCanvasId,
        versionNumber: execution.versionNumber,
        nodes: canvasState.data.nodes,
        edges: canvasState.data.edges,
        viewport: canvasState.data.viewport,
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

      const canvasState = CanvasStateSchema.safeParse({
        nodes: latestVersion.nodes,
        edges: latestVersion.edges,
        viewport: latestVersion.viewport ?? undefined,
      });

      if (!canvasState.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Canvas version contains invalid data",
        });
      }

      const execution = await createExecutionAndStartCanvasWorkflow({
        prisma: ctx.prisma,
        canvasId: input.canvasId,
        versionNumber: latestVersion.version,
        nodes: canvasState.data.nodes,
        edges: canvasState.data.edges,
        viewport: canvasState.data.viewport,
        input: input.input,
        teamId: ctx.teamId,
        triggeredById: ctx.session.user.id,
        triggerSource: input.triggerSource,
      });

      if (input.sessionId) {
        await bindExecutionToSession(
          ctx.prisma,
          execution.id,
          input.sessionId,
          input.turnId
        );

        await appendAndPublishRuntimeEvent(
          ctx.prisma,
          {
            sessionId: input.sessionId,
            canvasId: input.canvasId,
            teamId: ctx.teamId,
            turnId: input.turnId ?? execution.id,
          },
          {
            type: "execution.started",
            executionId: execution.id,
            status: "RUNNING",
          }
        );
      }

      return execution;
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

      if (input.sessionId && input.canvasId && approval.nodeId) {
        await appendAndPublishRuntimeEvent(
          ctx.prisma,
          {
            sessionId: input.sessionId,
            canvasId: input.canvasId,
            teamId: ctx.teamId,
            turnId: approval.executionId,
          },
          {
            type: "chat.user_message",
            content: `Approval ${input.status.toLowerCase()}: ${input.responseMessage ?? approval.nodeId}`,
          }
        );
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

        const result = await handleSkippedInput(
          workflowId,
          node.id,
          execution.id,
          ctx.session.user.id
        );

        if (input.sessionId) {
          await appendAndPublishRuntimeEvent(
            ctx.prisma,
            {
              sessionId: input.sessionId,
              canvasId: execution.agentCanvasId,
              teamId: ctx.teamId,
              turnId: execution.id,
            },
            {
              type: "chat.user_message",
              content: `Input skipped for node ${input.nodeId}`,
            }
          );
        }

        return result;
      }

      if (!input.values) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Input values are required",
        });
      }

      const result = await handleInputValues({
        workflowId,
        nodeId: node.id,
        executionId: execution.id,
        userId: ctx.session.user.id,
        config,
        values: input.values,
      });

      if (input.sessionId) {
        await appendAndPublishRuntimeEvent(
          ctx.prisma,
          {
            sessionId: input.sessionId,
            canvasId: execution.agentCanvasId,
            teamId: ctx.teamId,
            turnId: execution.id,
          },
          {
            type: "chat.user_message",
            content: `Input submitted for node ${input.nodeId}`,
          }
        );
      }

      return result;
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

  getOrCreateSession: withActiveTeam
    .input(GetOrCreateSessionInputSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);

      if (input.sessionId) {
        const existing = await findSessionById(
          ctx.prisma,
          input.sessionId,
          ctx.teamId
        );
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Session not found",
          });
        }
        if (existing.userId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied",
          });
        }
        return existing;
      }

      return createOrGetSession(ctx.prisma, {
        agentCanvasId: input.canvasId,
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
      });
    }),

  createSession: withActiveTeam
    .input(CreateSessionInputSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);

      return createNewSession(ctx.prisma, {
        agentCanvasId: input.canvasId,
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
        title: input.title,
      });
    }),

  archiveSession: withActiveTeam
    .input(ArchiveSessionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const session = await findSessionById(
        ctx.prisma,
        input.sessionId,
        ctx.teamId
      );

      if (!session || session.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      await archiveSession(ctx.prisma, input.sessionId, ctx.teamId);
      return { success: true };
    }),

  listSessions: withActiveTeam
    .input(ListSessionsInputSchema)
    .query(async ({ ctx, input }) => {
      await verifyCanvasAccess(ctx.prisma, input.canvasId, ctx.teamId);

      return listSessions(ctx.prisma, input.canvasId, ctx.teamId, {
        limit: input.limit,
        offset: input.offset,
        userId: ctx.session.user.id,
      });
    }),

  getSessionEvents: withActiveTeam
    .input(GetSessionEventsInputSchema)
    .query(async ({ ctx, input }) => {
      await verifySessionOwnership({
        db: ctx.prisma,
        sessionId: input.sessionId,
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
      });

      return listSessionEvents(ctx.prisma, input.sessionId, {
        limit: input.limit,
        cursorSequence: input.cursorSequence,
      });
    }),

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
    }): AsyncGenerator<RuntimeEvent> {
      const allowed = await rateLimiter.checkLimit(
        `api:buildCanvas:team:${ctx.teamId}`,
        BUILDS_PER_HOUR,
        ONE_HOUR_SECONDS
      );

      if (!allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Rate limit exceeded. Maximum ${BUILDS_PER_HOUR} builds per hour.`,
        });
      }

      const session = await verifySessionOwnership({
        db: ctx.prisma,
        sessionId: input.sessionId,
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
      });

      const turnId = input.turnId ?? crypto.randomUUID();
      const eventCtx = {
        sessionId: session.id,
        canvasId: session.agentCanvasId,
        teamId: ctx.teamId,
        turnId,
      };

      const userMessageEvent = await appendAndPublishRuntimeEvent(
        ctx.prisma,
        eventCtx,
        {
          type: "chat.user_message",
          content: input.prompt,
        }
      );
      yield userMessageEvent;

      if (!session.title) {
        const autoTitle = input.prompt.slice(0, 50).trim();
        await updateSessionTitle(ctx.prisma, session.id, autoTitle);
      }

      const priorEvents = await listSessionEvents(ctx.prisma, session.id, {
        limit: 500,
      });
      const conversationHistory = rebuildConversationHistory(priorEvents);

      const canvasState = input.canvasId
        ? await loadCanvasState(ctx.prisma, input.canvasId, ctx.teamId)
        : undefined;

      const agentCtx = {
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
        sessionId: input.sessionId,
        conversationHistory,
        state: createEmptyState(),
        metadata: {
          ...(input.canvasId ? { canvasId: input.canvasId } : {}),
          ...(canvasState ? { canvas: canvasState } : {}),
          ...(input.attachments?.length
            ? { attachments: input.attachments }
            : {}),
        },
      };

      const modelOverrides = input.model
        ? { model: { modelId: input.model } }
        : undefined;

      let assistantText = "";
      const toolNameByCallId = new Map<string, string>();
      const metrics = createBuildStreamDiagnostics();
      let streamOutcome: "completed" | "failed" = "completed";
      let streamErrorMessage: string | undefined;

      if (CANVAS_STREAM_DEBUG) {
        logger.info(
          {
            sessionId: session.id,
            canvasId: session.agentCanvasId,
            teamId: ctx.teamId,
            turnId,
            userId: ctx.session.user.id,
            hasCanvasId: Boolean(input.canvasId),
            hasModelOverride: Boolean(input.model),
            conversationTurnCount: conversationHistory.length,
            attachmentCount: input.attachments?.length ?? 0,
          },
          "Canvas builder stream started"
        );
      }

      try {
        for await (const event of streamCanvasBuilder(
          input.prompt,
          agentCtx,
          modelOverrides
        )) {
          metrics.builderEventCount += 1;
          incrementCounter(metrics.builderEventTypes, event.type);

          if (CANVAS_STREAM_DEBUG) {
            logger.info(
              {
                sessionId: session.id,
                canvasId: session.agentCanvasId,
                turnId,
                summary: summarizeBuilderEvent(event),
              },
              "Canvas builder event received"
            );
          }

          if (event.type === "text") {
            assistantText += event.chunk;
            metrics.assistantDeltaChars += event.chunk.length;
          }

          const rawPayload = mapBuilderEventToPayload(event, {
            toolNameByCallId,
          });
          if (!rawPayload) {
            metrics.skippedBuilderEventCount += 1;
            continue;
          }
          metrics.mappedPayloadCount += 1;
          incrementCounter(metrics.payloadTypes, rawPayload.type);
          if (rawPayload.type === "canvas.op_applied") {
            incrementCounter(
              metrics.canvasOperationTypes,
              rawPayload.operation.type
            );
          }

          if (rawPayload.type === "tool.call_result") {
            toolNameByCallId.delete(rawPayload.toolCallId);
          }

          const payload = redactToolPayload(rawPayload);
          const isEphemeral = isEphemeralEvent(payload.type);
          const runtimeEvent = isEphemeral
            ? await publishEphemeralRuntimeEvent(eventCtx, payload)
            : await appendAndPublishRuntimeEvent(ctx.prisma, eventCtx, payload);
          metrics.emittedRuntimeEventCount += 1;
          if (isEphemeral) {
            metrics.emittedEphemeralEventCount += 1;
          } else {
            metrics.emittedPersistedEventCount += 1;
          }

          if (CANVAS_STREAM_DEBUG) {
            logger.info(
              {
                sessionId: session.id,
                canvasId: session.agentCanvasId,
                turnId,
                runtimeEventId: runtimeEvent.eventId,
                sequence: runtimeEvent.sequence,
                visibility: runtimeEvent.visibility,
                payloadType: payload.type,
              },
              "Canvas builder runtime event emitted"
            );
          }
          yield runtimeEvent;
        }

        if (assistantText) {
          metrics.assistantFinalChars = assistantText.length;
          const assistantFinalEvent = await appendAndPublishRuntimeEvent(
            ctx.prisma,
            eventCtx,
            {
              type: "chat.assistant_final",
              content: assistantText,
            }
          );
          metrics.emittedRuntimeEventCount += 1;
          metrics.emittedPersistedEventCount += 1;
          incrementCounter(metrics.payloadTypes, "chat.assistant_final");

          if (CANVAS_STREAM_DEBUG) {
            logger.info(
              {
                sessionId: session.id,
                canvasId: session.agentCanvasId,
                turnId,
                runtimeEventId: assistantFinalEvent.eventId,
                sequence: assistantFinalEvent.sequence,
                payloadType: "chat.assistant_final",
                contentLength: assistantText.length,
              },
              "Canvas builder assistant final emitted"
            );
          }
          yield assistantFinalEvent;
        }
      } catch (streamError) {
        streamOutcome = "failed";
        streamErrorMessage =
          streamError instanceof Error
            ? streamError.message
            : String(streamError);
        logger.error(
          {
            error: streamError,
            sessionId: session.id,
            canvasId: session.agentCanvasId,
            teamId: ctx.teamId,
            turnId,
          },
          "Canvas builder stream failed"
        );

        const fallbackContent =
          assistantText ||
          "Sorry, something went wrong while processing your request.";
        metrics.assistantFinalChars = fallbackContent.length;

        const assistantFinalEvent = await appendAndPublishRuntimeEvent(
          ctx.prisma,
          eventCtx,
          {
            type: "chat.assistant_final",
            content: fallbackContent,
          }
        );
        metrics.emittedRuntimeEventCount += 1;
        metrics.emittedPersistedEventCount += 1;
        incrementCounter(metrics.payloadTypes, "chat.assistant_final");

        if (CANVAS_STREAM_DEBUG) {
          logger.info(
            {
              sessionId: session.id,
              canvasId: session.agentCanvasId,
              turnId,
              runtimeEventId: assistantFinalEvent.eventId,
              sequence: assistantFinalEvent.sequence,
              payloadType: "chat.assistant_final",
              contentLength: fallbackContent.length,
            },
            "Canvas builder fallback assistant final emitted"
          );
        }
        yield assistantFinalEvent;
      } finally {
        logBuildStreamSummary({
          session,
          teamId: ctx.teamId,
          turnId,
          outcome: streamOutcome,
          promptLength: input.prompt.length,
          conversationTurnCount: conversationHistory.length,
          pendingToolCalls: toolNameByCallId.size,
          errorMessage: streamErrorMessage,
          metrics,
        });

        cleanupSessionThrottleCache(session.id);
      }
    }),

  onSessionEvent: withActiveTeam
    .input(OnSessionEventInputSchema)
    .subscription(async function* ({
      ctx,
      input,
    }): AsyncGenerator<RuntimeEvent> {
      await verifySessionOwnership({
        db: ctx.prisma,
        sessionId: input.sessionId,
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
      });

      recordSessionStreamConnect();
      let lastYieldedSequence: number | undefined;

      if (input.lastSequence !== undefined) {
        const replayStart = performance.now();
        const missed = await listSessionEventsAfterSequence(
          ctx.prisma,
          input.sessionId,
          input.lastSequence
        );
        const replayDurationMs = performance.now() - replayStart;
        recordReplay(replayDurationMs, missed.length);

        for (const event of missed) {
          const mapped: RuntimeEvent = {
            eventId: event.id,
            sequence: event.sequence,
            timestamp: event.eventTimestamp.getTime(),
            canvasId: event.agentCanvasId,
            sessionId: event.sessionId,
            turnId: event.turnId ?? undefined,
            executionId: event.executionId ?? undefined,
            source: event.source as "user" | "agent" | "system" | "tool",
            visibility: (event.visibility ?? "visible") as
              | "visible"
              | "ephemeral"
              | "hidden",
            payload: event.payload as RuntimeEvent["payload"],
          };
          lastYieldedSequence = mapped.sequence;
          recordEventYielded("replay");
          yield mapped;
        }
      }

      const eventQueue: RuntimeEvent[] = [];
      let resolve: (() => void) | null = null;

      const unsubscribe = await createSessionRuntimeEventSubscriber(
        input.sessionId,
        (event) => {
          eventQueue.push(event);
          resolve?.();
        },
        (error) => {
          logger.error(
            { error, sessionId: input.sessionId },
            "Session event subscriber error"
          );
        }
      );

      try {
        while (true) {
          if (eventQueue.length === 0) {
            await new Promise<void>((r) => {
              resolve = r;
            });
          }

          while (eventQueue.length > 0) {
            const event = eventQueue.shift();
            if (event) {
              if (
                lastYieldedSequence !== undefined &&
                event.sequence !== undefined &&
                event.sequence > lastYieldedSequence + 1
              ) {
                recordSequenceGap();
              }
              if (event.sequence !== undefined) {
                lastYieldedSequence = event.sequence;
              }
              recordEventYielded("live");
              yield event;
            }
          }
        }
      } finally {
        recordSessionStreamDisconnect();
        await unsubscribe();
      }
    }),
});
