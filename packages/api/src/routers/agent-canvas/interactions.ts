import {
  findAgentCanvasExecution,
  findApprovalWithExecutionAuth,
  findPendingApproval,
  listPendingApprovals,
  respondToApproval,
} from "@openbeam/db";
import { submitCanvasApproval } from "@openbeam/temporal";
import { InputNodeConfigSchema } from "@openbeam/types/canvas";
import { TRPCError } from "@trpc/server";
import { resolveNodeConfig } from "../../utils/input-normalization";
import { appendAndPublishRuntimeEvent } from "../../utils/runtime-event-mapping";
import { withActiveTeam } from "../apps/middleware";
import {
  canUserInteractWithExecution,
  findInputNode,
  getCanvasVersion,
  handleInputValues,
  handleSkippedInput,
  parseCanvasState,
} from "./helpers";
import {
  approvalResponseSchema,
  pendingApprovalSchema,
  submitInputSchema,
} from "./schemas";

export const interactionProcedures = {
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
};
