import { findAgentCanvasById, findAgentCanvasVersion } from "@openbeam/db";
import { submitCanvasInput } from "@openbeam/temporal";
import {
  AgentCanvasEdgeSchema,
  AgentCanvasNodeSchema,
  CanvasStateSchema,
  type InputNodeConfigSchema,
} from "@openbeam/types/canvas";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { normalizeInputValues } from "../../utils/input-normalization";

export function canUserInteractWithExecution(
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

export async function verifyCanvasAccess(
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

export async function getCanvasVersion(
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

export function parseCanvasState(version: {
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

export function findInputNode(nodes: unknown[], nodeId: string) {
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

export async function handleSkippedInput(
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

export async function handleInputValues(params: {
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

export function rebuildConversationHistory(
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

export async function loadCanvasState(
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
