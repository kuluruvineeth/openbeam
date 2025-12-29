import { Queue } from "bullmq";
import { z } from "zod";
import { getSharedBullMqConnection } from "../client";
import { extractTraceContext } from "../utils/trace-context";

export const SearchEventPayloadSchema = z.object({
  query: z.string(),
  queryEmbedding: z.array(z.number()),
  resultCount: z.number(),
  impressionId: z.string(),
});

export const ClickEventPayloadSchema = z.object({
  docId: z.string(),
  docEmbedding: z.array(z.number()),
  connectorType: z.string(),
  authorId: z.string().nullable(),
  topicIds: z.array(z.string()),
  position: z.number(),
  dwellMs: z.number(),
});

export const FeedbackEventPayloadSchema = z.object({
  docId: z.string(),
  feedbackType: z.enum(["helpful", "not_helpful"]),
});

export const ProfileUpdateJobDataSchema = z.object({
  type: z.enum(["search", "click", "feedback"]),
  userId: z.string(),
  teamId: z.string(),
  payload: z.union([
    SearchEventPayloadSchema,
    ClickEventPayloadSchema,
    FeedbackEventPayloadSchema,
  ]),
  traceContext: z.unknown().optional(),
});

export type SearchEventPayload = z.infer<typeof SearchEventPayloadSchema>;
export type ClickEventPayload = z.infer<typeof ClickEventPayloadSchema>;
export type FeedbackEventPayload = z.infer<typeof FeedbackEventPayloadSchema>;
export type ProfileUpdateType = z.infer<
  typeof ProfileUpdateJobDataSchema
>["type"];
export type ProfileUpdateJobData = z.infer<typeof ProfileUpdateJobDataSchema>;

const QUEUE_NAME = "profile-update";

export const profileUpdateQueue = new Queue<ProfileUpdateJobData>(QUEUE_NAME, {
  connection: getSharedBullMqConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: {
      age: 3600,
      count: 1000,
    },
    removeOnFail: {
      age: 86_400,
    },
  },
});

export async function addProfileUpdateJob(
  data: ProfileUpdateJobData,
  priority?: number
): Promise<void> {
  const jobPriority = priority ?? (data.type === "feedback" ? 1 : 5);

  const jobData: ProfileUpdateJobData = {
    ...data,
    traceContext: data.traceContext ?? extractTraceContext(),
  };

  await profileUpdateQueue.add(data.type, jobData, {
    priority: jobPriority,
    jobId: `profile-${data.userId}-${data.type}-${Date.now()}`,
  });
}

export async function getProfileUpdateQueueMetrics() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    profileUpdateQueue.getWaitingCount(),
    profileUpdateQueue.getActiveCount(),
    profileUpdateQueue.getCompletedCount(),
    profileUpdateQueue.getFailedCount(),
    profileUpdateQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

export async function closeProfileUpdateQueue(): Promise<void> {
  await profileUpdateQueue.close();
}
