export const TASK_QUEUES = {
  SYNC_GMAIL: "sync:gmail",
  SYNC_GOOGLE_DRIVE: "sync:google-drive",
  SYNC_SLACK: "sync:slack",
  SYNC_LINEAR: "sync:linear",
  SYNC_NOTION: "sync:notion",
  FILE_PROCESSING: "file-processing",
  MEDIA_PROCESSING: "media-processing",
  WEBHOOKS: "webhooks",
  AGENTS: "agents",
  CANVAS: "canvas",
  MAINTENANCE: "maintenance",
  TRAINING: "training",
  SCHEDULED: "scheduled",
  MISSION: "mission",
  KNOWLEDGE: "knowledge",
  KNOWLEDGE_INFERENCE: "knowledge-inference",
  DEFAULT: "default",
} as const;

export type TaskQueue = (typeof TASK_QUEUES)[keyof typeof TASK_QUEUES];

export function getTaskQueueForConnector(connectorType: string): TaskQueue {
  const mapping: Record<string, TaskQueue> = {
    gmail: TASK_QUEUES.SYNC_GMAIL,
    "google-drive": TASK_QUEUES.SYNC_GOOGLE_DRIVE,
    slack: TASK_QUEUES.SYNC_SLACK,
    linear: TASK_QUEUES.SYNC_LINEAR,
    notion: TASK_QUEUES.SYNC_NOTION,
  };

  return mapping[connectorType] ?? TASK_QUEUES.DEFAULT;
}
