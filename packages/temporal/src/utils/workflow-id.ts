export type WorkflowType =
  | "sync"
  | "index"
  | "file"
  | "media"
  | "webhook"
  | "agent"
  | "canvas"
  | "cleanup"
  | "maintenance"
  | "heartbeat"
  | "scheduler"
  | "timer"
  | "reaper"
  | "computer";

export interface WorkflowIdOptions {
  type: WorkflowType;
  connectorId?: string;
  documentId?: string;
  agentId?: string;
  sessionId?: string;
  executionId?: string;
  teamId?: string;
  runId?: string;
  timestamp?: number;
}

function generateSyncWorkflowId(
  connectorId: string | undefined,
  _ts: number
): string {
  if (!connectorId) {
    throw new Error("connectorId required for sync");
  }
  return `sync:${connectorId}`;
}

function generateIndexWorkflowId(
  connectorId: string | undefined,
  ts: number
): string {
  if (!connectorId) {
    throw new Error("connectorId required for index");
  }
  return `index:${connectorId}:${ts}`;
}

function generateFileWorkflowId(
  documentId: string | undefined,
  _ts: number
): string {
  if (!documentId) {
    throw new Error("documentId required for file");
  }
  return `file:${documentId}`;
}

function generateMediaWorkflowId(
  documentId: string | undefined,
  _ts: number
): string {
  if (!documentId) {
    throw new Error("documentId required for media");
  }
  return `media:${documentId}`;
}

function generateWebhookWorkflowId(
  connectorId: string | undefined,
  _ts: number
): string {
  if (!connectorId) {
    throw new Error("connectorId required for webhook");
  }
  return `webhook:${connectorId}`;
}

function generateAgentWorkflowId(
  agentId: string | undefined,
  sessionId: string | undefined,
  _ts: number
): string {
  if (!agentId) {
    throw new Error("agentId required for agent");
  }
  return `agent:${agentId}:${sessionId ?? ""}`;
}

function generateCanvasWorkflowId(
  executionId: string | undefined,
  _ts: number
): string {
  if (!executionId) {
    throw new Error("executionId required for canvas");
  }
  return `canvas:${executionId}`;
}

function generateCleanupWorkflowId(
  connectorId: string | undefined,
  _ts: number
): string {
  if (!connectorId) {
    throw new Error("connectorId required for cleanup");
  }
  return `cleanup:${connectorId}`;
}

function generateHeartbeatWorkflowId(
  agentId: string | undefined,
  runId: string | undefined
): string {
  if (!agentId) {
    throw new Error("agentId required for heartbeat");
  }
  if (!runId) {
    throw new Error("runId required for heartbeat");
  }
  return `heartbeat:${agentId}:${runId}`;
}

function generateSchedulerWorkflowId(teamId: string | undefined): string {
  if (!teamId) {
    throw new Error("teamId required for scheduler");
  }
  return `scheduler:${teamId}`;
}

function generateTimerWorkflowId(agentId: string | undefined): string {
  if (!agentId) {
    throw new Error("agentId required for timer");
  }
  return `timer:${agentId}`;
}

function generateReaperWorkflowId(teamId: string | undefined): string {
  if (!teamId) {
    throw new Error("teamId required for reaper");
  }
  return `reaper:${teamId}`;
}

function generateComputerWorkflowId(runId: string | undefined): string {
  if (!runId) {
    throw new Error("runId required for computer");
  }
  return `computer:${runId}`;
}

const WORKFLOW_ID_GENERATORS: Record<
  WorkflowType,
  (options: WorkflowIdOptions, _ts: number) => string
> = {
  sync: (o, _ts) => generateSyncWorkflowId(o.connectorId, _ts),
  index: (o, _ts) => generateIndexWorkflowId(o.connectorId, _ts),
  file: (o, _ts) => generateFileWorkflowId(o.documentId, _ts),
  media: (o, _ts) => generateMediaWorkflowId(o.documentId, _ts),
  webhook: (o, _ts) => generateWebhookWorkflowId(o.connectorId, _ts),
  agent: (o, _ts) => generateAgentWorkflowId(o.agentId, o.sessionId, _ts),
  canvas: (o, _ts) => generateCanvasWorkflowId(o.executionId, _ts),
  cleanup: (o, _ts) => generateCleanupWorkflowId(o.connectorId, _ts),
  maintenance: (_, ts) => `maintenance:${ts}`,
  heartbeat: (o) => generateHeartbeatWorkflowId(o.agentId, o.runId),
  scheduler: (o) => generateSchedulerWorkflowId(o.teamId),
  timer: (o) => generateTimerWorkflowId(o.agentId),
  reaper: (o) => generateReaperWorkflowId(o.teamId),
  computer: (o) => generateComputerWorkflowId(o.runId),
};

export function generateWorkflowId(options: WorkflowIdOptions): string {
  const ts = options.timestamp ?? Date.now();
  const generator = WORKFLOW_ID_GENERATORS[options.type];

  if (!generator) {
    throw new Error(`Unknown workflow type: ${options.type}`);
  }

  return generator(options, ts);
}

export function parseWorkflowId(workflowId: string): {
  type: WorkflowType;
  entityId: string;
  timestamp: number;
} {
  const parts = workflowId.split(":");

  if (parts.length < 2) {
    throw new Error(`Invalid workflow ID format: ${workflowId}`);
  }

  const type = parts[0] as WorkflowType;
  const entityId = parts[1] ?? "";
  const timestamp = Number.parseInt(parts[2] ?? "0", 10);

  return { type, entityId, timestamp };
}

export function isActiveSync(workflowId: string): boolean {
  return workflowId.startsWith("sync:");
}

export function extractConnectorId(workflowId: string): string | null {
  const prefixes = ["sync:", "index:", "webhook:", "cleanup:"];

  for (const prefix of prefixes) {
    if (workflowId.startsWith(prefix)) {
      const parts = workflowId.slice(prefix.length).split(":");
      return parts[0] ?? null;
    }
  }

  return null;
}
