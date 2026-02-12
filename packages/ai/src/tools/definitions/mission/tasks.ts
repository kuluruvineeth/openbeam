import type { ToolExecutionResult } from "@openplane/types/ai";
import { z } from "zod";
import { defineTool, success } from "../../builder";
import { getMissionContext, getMissionServices } from "./memory";

function extractTaskId(ctx: unknown): string {
  const taskId = (ctx as Record<string, unknown>).taskId;
  if (typeof taskId !== "string" || !taskId) {
    throw new Error("Task context required: taskId must be present");
  }
  return taskId;
}

export const missionCreateTask = defineTool({
  name: "mission_create_task",
  description:
    "Create a new subtask within the current mission. Use this to break down work into smaller pieces or delegate research to other agents.",
  category: "mission",
  stakes: "medium",
  reversibility: "easy",
  searchKeywords: ["mission", "task", "create", "subtask", "delegate"],

  parameters: z.object({
    title: z.string().describe("Title of the new task"),
    description: z.string().optional().describe("Detailed description"),
    priority: z.enum(["P0", "P1", "P2", "P3"]).default("P2"),
    dependsOn: z
      .array(z.string())
      .optional()
      .describe("Task IDs this depends on"),
    requiredCapabilities: z
      .array(z.string())
      .optional()
      .describe("Agent capabilities needed"),
  }),

  async execute(
    params,
    ctx
  ): Promise<ToolExecutionResult<{ taskId: string; created: boolean }>> {
    const services = getMissionServices();
    const mCtx = getMissionContext(ctx);

    const result = await services.createTask({
      missionId: mCtx.missionId,
      agentId: mCtx.agentId,
      ...params,
    });

    return success({ taskId: result.taskId, created: true });
  },
});

export const missionSendFeedback = defineTool({
  name: "mission_send_feedback",
  description:
    "Send feedback on a completed task, optionally reopening it for revision. Use this when reviewing work that needs improvement.",
  category: "mission",
  stakes: "medium",
  reversibility: "easy",
  searchKeywords: ["mission", "feedback", "review", "reopen", "revision"],

  parameters: z.object({
    taskId: z.string().describe("ID of the task to send feedback on"),
    feedback: z.string().describe("Feedback content"),
    reopen: z
      .boolean()
      .default(false)
      .describe("Whether to reopen the task for revision"),
  }),

  async execute(params, ctx): Promise<ToolExecutionResult<{ sent: boolean }>> {
    const services = getMissionServices();
    const mCtx = getMissionContext(ctx);

    await services.sendFeedback({
      taskId: params.taskId,
      fromAgentId: mCtx.agentId,
      feedback: params.feedback,
      reopen: params.reopen,
    });

    return success({ sent: true });
  },
});

export const missionUpdateTaskStatus = defineTool({
  name: "mission_update_task_status",
  description:
    "Update the status of the current task. Use this to signal progress, completion, or blockers during mission execution.",
  category: "mission",
  stakes: "medium",
  reversibility: "easy",
  searchKeywords: ["task", "status", "progress", "complete", "block"],

  parameters: z.object({
    status: z
      .enum(["IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"])
      .describe("New task status"),
    note: z
      .string()
      .optional()
      .describe("Optional note explaining the status change"),
  }),

  async execute(
    params,
    ctx
  ): Promise<ToolExecutionResult<{ updated: boolean }>> {
    const services = getMissionServices();
    const mCtx = getMissionContext(ctx);
    const taskId = extractTaskId(ctx);

    const result = await services.updateTaskStatus({
      taskId,
      status: params.status,
      agentId: mCtx.agentId,
      note: params.note,
    });

    return success({ updated: result.updated });
  },
});
