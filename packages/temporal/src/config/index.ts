import { z } from "zod";

export const TemporalConfigSchema = z.object({
  address: z.string().default("localhost:7233"),
  namespace: z.string().default("default"),
  tls: z
    .object({
      certPath: z.string().optional(),
      keyPath: z.string().optional(),
      caPath: z.string().optional(),
    })
    .optional(),
});

export type TemporalConfig = z.infer<typeof TemporalConfigSchema>;

export const WorkerConfigSchema = z.object({
  taskQueue: z.string(),
  maxConcurrentActivityTaskExecutions: z.number().default(100),
  maxConcurrentWorkflowTaskExecutions: z.number().default(100),
  maxCachedWorkflows: z.number().default(1000),
  stickyQueueScheduleToStartTimeoutMs: z.number().default(10_000),
  buildId: z.string().optional(),
});

export type WorkerConfig = z.infer<typeof WorkerConfigSchema>;

export function loadTemporalConfig(): TemporalConfig {
  return TemporalConfigSchema.parse({
    address: process.env.TEMPORAL_ADDRESS,
    namespace: process.env.TEMPORAL_NAMESPACE,
    tls: process.env.TEMPORAL_TLS_CERT
      ? {
          certPath: process.env.TEMPORAL_TLS_CERT,
          keyPath: process.env.TEMPORAL_TLS_KEY,
          caPath: process.env.TEMPORAL_TLS_CA,
        }
      : undefined,
  });
}

export {
  DATABASE_RETRY_POLICY,
  DEFAULT_RETRY_POLICY,
  ENGINE_RETRY_POLICY,
  getRetryPolicyForActivity,
  MEDIA_RETRY_POLICY,
  STORAGE_RETRY_POLICY,
  SYNC_RETRY_POLICY,
  WEBHOOK_RETRY_POLICY,
} from "./retry-policies";
export {
  getTaskQueueForConnector,
  TASK_QUEUES,
  type TaskQueue,
} from "./task-queues";

export {
  type ActivityTimeouts,
  AGENT_TIMEOUTS,
  DATABASE_TIMEOUTS,
  DEFAULT_TIMEOUTS,
  ENGINE_CHUNK_TIMEOUTS,
  ENGINE_EMBED_TIMEOUTS,
  ENGINE_PARSE_TIMEOUTS,
  getTimeoutsForActivity,
  MEDIA_ANALYZE_TIMEOUTS,
  MEDIA_TRANSCODE_TIMEOUTS,
  STORAGE_TIMEOUTS,
  SYNC_TIMEOUTS,
  WEBHOOK_TIMEOUTS,
  WORKFLOW_TIMEOUTS,
} from "./timeouts";
