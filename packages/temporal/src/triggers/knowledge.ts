import { KnowledgeInferenceInputSchema } from "@openplane/types/temporal/workflows/knowledge-inference";
import {
  ScheduleOverlapPolicy,
  WorkflowExecutionAlreadyStartedError,
} from "@temporalio/client";
import { getTemporalClient } from "../client";
import { TASK_QUEUES } from "../config/task-queues";

export interface StartKnowledgeInferenceOptions {
  teamId: string;
  inferenceType: "daily" | "weekly";
  sinceTimestamp?: number;
  decayHalfLifeDays?: number;
  coOccurrenceThreshold?: number;
  confidenceThreshold?: number;
  remainingTeamIds?: string[];
}

export interface KnowledgeInferenceHandle {
  workflowId: string;
  runId: string;
}

function getInferenceWorkflowId(teamId: string, inferenceType: string): string {
  return `kg-inference:${teamId}:${inferenceType}`;
}

export async function startKnowledgeInference(
  options: StartKnowledgeInferenceOptions
): Promise<KnowledgeInferenceHandle> {
  const client = await getTemporalClient();
  const workflowId = getInferenceWorkflowId(
    options.teamId,
    options.inferenceType
  );

  const input = KnowledgeInferenceInputSchema.parse({
    teamId: options.teamId,
    inferenceType: options.inferenceType,
    sinceTimestamp: options.sinceTimestamp,
    decayHalfLifeDays: options.decayHalfLifeDays,
    coOccurrenceThreshold: options.coOccurrenceThreshold,
    confidenceThreshold: options.confidenceThreshold,
    remainingTeamIds: options.remainingTeamIds,
    includePatternDetection: options.inferenceType === "weekly",
  });

  try {
    const handle = await client.workflow.start("knowledgeInferenceWorkflow", {
      taskQueue: TASK_QUEUES.KNOWLEDGE_INFERENCE,
      workflowId,
      args: [input],
      memo: {
        teamId: options.teamId,
        inferenceType: options.inferenceType,
      },
    });

    return {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId,
    };
  } catch (error) {
    if (error instanceof WorkflowExecutionAlreadyStartedError) {
      return { workflowId, runId: "" };
    }
    throw error;
  }
}

export async function createKnowledgeInferenceSchedule(
  teamId: string,
  cron: string,
  inferenceType: "daily" | "weekly"
): Promise<string> {
  const client = await getTemporalClient();
  const scheduleId = `kg-inference-schedule:${teamId}:${inferenceType}`;

  const input = KnowledgeInferenceInputSchema.parse({
    teamId,
    inferenceType,
    decayHalfLifeDays: 30,
    coOccurrenceThreshold: 3,
    confidenceThreshold: 0.6,
    includePatternDetection: inferenceType === "weekly",
  });

  try {
    const handle = await client.schedule.create({
      scheduleId,
      spec: { cronExpressions: [cron] },
      action: {
        type: "startWorkflow",
        workflowType: "knowledgeInferenceWorkflow",
        taskQueue: TASK_QUEUES.KNOWLEDGE_INFERENCE,
        args: [input],
      },
      policies: {
        overlap: ScheduleOverlapPolicy.SKIP,
      },
    });

    return handle.scheduleId;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("already registered")
    ) {
      return scheduleId;
    }
    throw error;
  }
}

export async function deleteKnowledgeInferenceSchedule(
  teamId: string,
  inferenceType: "daily" | "weekly"
): Promise<boolean> {
  const client = await getTemporalClient();
  const scheduleId = `kg-inference-schedule:${teamId}:${inferenceType}`;

  try {
    const handle = client.schedule.getHandle(scheduleId);
    await handle.delete();
    return true;
  } catch {
    return false;
  }
}
