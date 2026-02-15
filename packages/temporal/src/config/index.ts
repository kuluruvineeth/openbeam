import { z } from "zod";
import { TASK_QUEUES } from "./task-queues";

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

export function loadMissionWorkerConfig(): WorkerConfig {
  return WorkerConfigSchema.parse({
    taskQueue: process.env.TEMPORAL_MISSION_TASK_QUEUE ?? TASK_QUEUES.MISSION,
    maxConcurrentActivityTaskExecutions: process.env.TEMPORAL_MAX_ACTIVITIES
      ? Number(process.env.TEMPORAL_MAX_ACTIVITIES)
      : 10,
    maxConcurrentWorkflowTaskExecutions: process.env.TEMPORAL_MAX_WORKFLOWS
      ? Number(process.env.TEMPORAL_MAX_WORKFLOWS)
      : 100,
    maxCachedWorkflows: process.env.TEMPORAL_MAX_CACHED
      ? Number(process.env.TEMPORAL_MAX_CACHED)
      : 500,
  });
}

export {
  initMessagingMetricsBridge,
  resetMessagingMetricsBridge,
} from "./messaging-metrics-bridge";
export {
  InMemoryCounter,
  InMemoryGauge,
  InMemoryHistogram,
  type MetricLabels,
  resetAllMetrics,
  snapshotMetrics,
  swarmMetrics,
} from "./metrics";
export {
  AGENT_CHUNKED_RETRY_POLICY,
  DATABASE_RETRY_POLICY,
  DEFAULT_RETRY_POLICY,
  ENGINE_RETRY_POLICY,
  EXTERNAL_API_RETRY_POLICY,
  getRetryPolicyForActivity,
  LLM_CALL_RETRY_POLICY,
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
  AGENT_EXTENDED_TIMEOUTS,
  AGENT_MARATHON_TIMEOUTS,
  AGENT_QUICK_TIMEOUTS,
  AGENT_STANDARD_TIMEOUTS,
  AGENT_TIMEOUTS,
  computeHeartbeatInterval,
  computeHeartbeatIntervalMs,
  DATABASE_TIMEOUTS,
  DEFAULT_TIMEOUTS,
  ENGINE_CHUNK_TIMEOUTS,
  ENGINE_EMBED_TIMEOUTS,
  ENGINE_PARSE_TIMEOUTS,
  getTimeoutsForActivity,
  LLM_CALL_TIMEOUTS,
  MEDIA_ANALYZE_TIMEOUTS,
  MEDIA_TRANSCODE_TIMEOUTS,
  REFLECTION_TIMEOUTS,
  STORAGE_TIMEOUTS,
  SYNC_TIMEOUTS,
  WEBHOOK_TIMEOUTS,
  WORKFLOW_TIMEOUTS,
} from "./timeouts";
