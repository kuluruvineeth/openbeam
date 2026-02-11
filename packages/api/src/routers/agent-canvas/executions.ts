import {
  bindExecutionToSession,
  findAgentCanvasExecution,
  findAgentCanvasVersion,
  listAgentCanvasExecutions,
  listAgentCanvasVersions,
} from "@openplane/db";
import { createExecutionAndStartCanvasWorkflow } from "@openplane/orchestrations";
import { createExecutionEventSubscriber, rateLimiter } from "@openplane/redis";
import { logger } from "@openplane/services/lib/logger";
import { CanvasStateSchema } from "@openplane/types/canvas";
import type { ExecutionEvent } from "@openplane/types/canvas/execution-events";
import { TRPCError } from "@trpc/server";
import { appendAndPublishRuntimeEvent } from "../../utils/runtime-event-mapping";
import { withActiveTeam } from "../apps/middleware";
import { canUserInteractWithExecution, verifyCanvasAccess } from "./helpers";
import {
  createExecutionSchema,
  EXECUTIONS_PER_HOUR,
  executionIdSchema,
  listExecutionsSchema,
  ONE_HOUR_SECONDS,
} from "./schemas";

export const executionProcedures = {
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
};
