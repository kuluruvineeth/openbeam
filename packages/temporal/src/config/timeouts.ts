export interface ActivityTimeouts {
  startToCloseTimeout: string;
  scheduleToCloseTimeout?: string;
  heartbeatTimeout?: string;
}

export const DEFAULT_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "30s",
  heartbeatTimeout: "10s",
};

export const SYNC_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "5m",
  heartbeatTimeout: "30s",
};

export const ENGINE_PARSE_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "2m",
  heartbeatTimeout: "30s",
};

export const ENGINE_CHUNK_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "1m",
  heartbeatTimeout: "15s",
};

export const ENGINE_EMBED_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "2m",
  heartbeatTimeout: "30s",
};

export const MEDIA_TRANSCODE_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "30m",
  scheduleToCloseTimeout: "1h",
  heartbeatTimeout: "1m",
};

export const MEDIA_ANALYZE_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "10m",
  heartbeatTimeout: "1m",
};

export const STORAGE_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "5m",
  heartbeatTimeout: "30s",
};

export const DATABASE_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "30s",
};

export const WEBHOOK_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "1m",
  heartbeatTimeout: "15s",
};

export const AGENT_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "10m",
  heartbeatTimeout: "1m",
};

export const AGENT_QUICK_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "5m",
  scheduleToCloseTimeout: "10m",
  heartbeatTimeout: "30s",
};

export const AGENT_STANDARD_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "30m",
  scheduleToCloseTimeout: "1h",
  heartbeatTimeout: "2m",
};

export const AGENT_EXTENDED_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "2h",
  scheduleToCloseTimeout: "4h",
  heartbeatTimeout: "5m",
};

export const AGENT_MARATHON_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "24h",
  scheduleToCloseTimeout: "48h",
  heartbeatTimeout: "10m",
};

export const AGENT_LIFECYCLE_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "30s",
};

export const AGENT_SCHEDULER_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "2m",
  heartbeatTimeout: "30s",
};

export const AGENT_REAPER_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "5m",
  heartbeatTimeout: "1m",
};

export const LLM_CALL_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "3m",
  heartbeatTimeout: "45s",
};

export const REFLECTION_TIMEOUTS: ActivityTimeouts = {
  startToCloseTimeout: "5m",
  heartbeatTimeout: "60s",
};

export const WORKFLOW_TIMEOUTS = {
  SYNC_WORKFLOW: "4h",
  FILE_PROCESSING_WORKFLOW: "30m",
  MEDIA_PROCESSING_WORKFLOW: "2h",
  WEBHOOK_WORKFLOW: "5m",
  AGENT_WORKFLOW: "30m",
  CLEANUP_WORKFLOW: "1h",
  CONNECTOR_CLEANUP_WORKFLOW: "96h",
} as const;

const DURATION_REGEX = /^(\d+(?:\.\d+)?)(ms|s|m|h)$/;

function parseDurationMs(duration: string): number {
  const match = duration.match(DURATION_REGEX);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const value = Number(match[1]);
  const unit = match[2] as "ms" | "s" | "m" | "h";
  const multipliers = { ms: 1, s: 1000, m: 60_000, h: 3_600_000 } as const;
  return Math.round(value * multipliers[unit]);
}

function formatDurationMs(ms: number): string {
  if (ms >= 3_600_000 && ms % 3_600_000 === 0) {
    return `${ms / 3_600_000}h`;
  }
  if (ms >= 60_000 && ms % 60_000 === 0) {
    return `${ms / 60_000}m`;
  }
  return `${Math.round(ms / 1000)}s`;
}

export function computeHeartbeatInterval(heartbeatTimeout: string): string {
  const timeoutMs = parseDurationMs(heartbeatTimeout);
  const intervalMs = Math.max(5000, Math.floor(timeoutMs / 3));
  return formatDurationMs(intervalMs);
}

export function computeHeartbeatIntervalMs(heartbeatTimeoutMs: number): number {
  return Math.max(5000, Math.floor(heartbeatTimeoutMs / 3));
}

export function getTimeoutsForActivity(activityType: string): ActivityTimeouts {
  const mapping: Record<string, ActivityTimeouts> = {
    sync: SYNC_TIMEOUTS,
    fetch: SYNC_TIMEOUTS,
    parse: ENGINE_PARSE_TIMEOUTS,
    chunk: ENGINE_CHUNK_TIMEOUTS,
    embed: ENGINE_EMBED_TIMEOUTS,
    transcode: MEDIA_TRANSCODE_TIMEOUTS,
    analyze: MEDIA_ANALYZE_TIMEOUTS,
    storage: STORAGE_TIMEOUTS,
    database: DATABASE_TIMEOUTS,
    webhook: WEBHOOK_TIMEOUTS,
    agent: AGENT_TIMEOUTS,
    agentLifecycle: AGENT_LIFECYCLE_TIMEOUTS,
    agentScheduler: AGENT_SCHEDULER_TIMEOUTS,
    agentReaper: AGENT_REAPER_TIMEOUTS,
    llm_call: LLM_CALL_TIMEOUTS,
    reflection: REFLECTION_TIMEOUTS,
  };

  return mapping[activityType] ?? DEFAULT_TIMEOUTS;
}
