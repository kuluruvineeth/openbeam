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

export const WORKFLOW_TIMEOUTS = {
  SYNC_WORKFLOW: "4h",
  FILE_PROCESSING_WORKFLOW: "30m",
  MEDIA_PROCESSING_WORKFLOW: "2h",
  WEBHOOK_WORKFLOW: "5m",
  AGENT_WORKFLOW: "30m",
  CLEANUP_WORKFLOW: "1h",
  CONNECTOR_CLEANUP_WORKFLOW: "96h",
} as const;

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
  };

  return mapping[activityType] ?? DEFAULT_TIMEOUTS;
}
