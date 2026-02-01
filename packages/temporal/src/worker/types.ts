export type WorkerType =
  | "sync"
  | "file"
  | "media"
  | "webhook"
  | "agent"
  | "maintenance"
  | "scheduled";

export interface WorkerOptions {
  taskQueue: string;
  maxConcurrentActivities?: number;
  maxConcurrentWorkflows?: number;
}
