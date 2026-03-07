import {
  createEmptyState,
  createGetToolParameters,
  registerAllTools,
  streamCanvasBuilder,
  toolRegistry,
  toToolPickerItems,
} from "@openbeam/ai";
import {
  listSessionEvents,
  listSessionEventsAfterSequence,
  updateSessionTitle,
} from "@openbeam/db";
import {
  cleanupSessionThrottleCache,
  createSessionRuntimeEventSubscriber,
  rateLimiter,
} from "@openbeam/redis";
import { logger } from "@openbeam/services/lib/logger";
import { redactToolPayload } from "@openbeam/services/policy/redaction-policy";
import type { RuntimeEvent } from "@openbeam/types/canvas/runtime-events";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { verifySessionOwnership } from "../../middleware/session-auth";
import {
  recordEventYielded,
  recordReplay,
  recordSequenceGap,
  recordSessionStreamConnect,
  recordSessionStreamDisconnect,
} from "../../observability/runtime-stream-metrics";
import {
  appendAndPublishRuntimeEvent,
  isEphemeralEvent,
  mapBuilderEventToPayload,
  publishEphemeralRuntimeEvent,
} from "../../utils/runtime-event-mapping";
import { withActiveTeam } from "../apps/middleware";
import {
  createBuildStreamDiagnostics,
  incrementCounter,
  logBuildStreamSummary,
  summarizeBuilderEvent,
} from "./diagnostics";
import { loadCanvasState, rebuildConversationHistory } from "./helpers";
import {
  BUILDS_PER_HOUR,
  buildCanvasSchema,
  CANVAS_STREAM_DEBUG,
  ONE_HOUR_SECONDS,
  OnSessionEventInputSchema,
} from "./schemas";

export const builderProcedures = {
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
};
