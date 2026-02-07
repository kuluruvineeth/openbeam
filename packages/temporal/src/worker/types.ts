export type WorkerType =
  | "sync"
  | "file"
  | "media"
  | "webhook"
  | "agent"
  | "canvas"
  | "maintenance"
  | "scheduled"
  | "knowledge";

export interface WorkerOptions {
  taskQueue: string;
  maxConcurrentActivities?: number;
  maxConcurrentWorkflows?: number;
}
