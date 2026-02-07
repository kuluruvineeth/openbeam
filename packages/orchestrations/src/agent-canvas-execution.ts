import type { Database } from "@openplane/db";
import {
  createAgentCanvasExecution,
  updateAgentCanvasExecution,
} from "@openplane/db";
import { startCanvasExecution } from "@openplane/temporal";
import {
  AgentCanvasEdgeSchema,
  AgentCanvasNodeSchema,
  type CanvasState,
  ViewportSchema,
} from "@openplane/types/canvas";
import { z } from "zod";

type AgentCanvasExecution = Awaited<
  ReturnType<typeof createAgentCanvasExecution>
>;

export type StartCanvasExecutionDeps = {
  createAgentCanvasExecution: typeof createAgentCanvasExecution;
  updateAgentCanvasExecution: typeof updateAgentCanvasExecution;
  startCanvasExecution: typeof startCanvasExecution;
};

const defaultDeps: StartCanvasExecutionDeps = {
  createAgentCanvasExecution,
  updateAgentCanvasExecution,
  startCanvasExecution,
};

const CreateExecutionAndStartCanvasWorkflowParamsSchema = z.object({
  deps: z.custom<StartCanvasExecutionDeps>().optional(),
  prisma: z.custom<Database>(),
  canvasId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  nodes: z.array(AgentCanvasNodeSchema),
  edges: z.array(AgentCanvasEdgeSchema),
  viewport: ViewportSchema.optional(),
  input: z.unknown().optional(),
  teamId: z.string().uuid(),
  triggeredById: z.string().uuid(),
  triggerSource: z.string().optional(),
});

export type CreateExecutionAndStartCanvasWorkflowParams = z.infer<
  typeof CreateExecutionAndStartCanvasWorkflowParamsSchema
>;

export async function createExecutionAndStartCanvasWorkflow(
  rawParams: CreateExecutionAndStartCanvasWorkflowParams
): Promise<AgentCanvasExecution> {
  const params =
    CreateExecutionAndStartCanvasWorkflowParamsSchema.parse(rawParams);

  const {
    deps = defaultDeps,
    prisma,
    canvasId,
    versionNumber,
    nodes,
    edges,
    viewport,
    input,
    teamId,
    triggeredById,
    triggerSource,
  } = params;

  const execution = await deps.createAgentCanvasExecution(prisma, {
    agentCanvasId: canvasId,
    versionNumber,
    input,
    trace: { steps: [] },
    triggeredById,
    triggerSource,
  });

  const canvas: CanvasState = {
    nodes,
    edges,
    viewport,
  };

  try {
    const handle = await deps.startCanvasExecution({
      executionId: execution.id,
      agentCanvasId: canvasId,
      versionNumber,
      teamId,
      triggeredById,
      triggerSource,
      input,
      canvas,
    });

    return await deps.updateAgentCanvasExecution(prisma, execution.id, teamId, {
      status: "RUNNING",
      workflowId: handle.workflowId,
      runId: handle.runId,
      temporalStatus: "RUNNING",
    });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    const errorDetails =
      error instanceof Error
        ? {
            message: error.message,
            type: error.constructor.name,
            stack: isProduction
              ? error.stack?.split("\n").slice(0, 3).join("\n")
              : error.stack,
          }
        : { message: String(error), type: "Unknown" };

    await deps.updateAgentCanvasExecution(prisma, execution.id, teamId, {
      status: "FAILED",
      error: JSON.stringify(errorDetails),
    });

    throw error;
  }
}
