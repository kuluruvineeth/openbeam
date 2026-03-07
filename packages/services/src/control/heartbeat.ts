import {
  claimControlWakeupRequest,
  completeControlHeartbeatRun,
  completeControlWakeupRequest,
  createControlCostEvent,
  createControlHeartbeatRun,
  createControlHeartbeatRunEvent,
  createControlWakeupRequest,
  type Database,
  failControlHeartbeatRun,
  failControlWakeupRequest,
  findControlAgentById,
  findControlAgentRuntimeState,
  findRunningHeartbeatRun,
  incrementControlAgentRuntimeTokens,
  listControlHeartbeatRuns,
  startControlHeartbeatRun,
  updateControlAgentHeartbeat,
  updateControlAgentStatus,
  upsertControlAgentRuntimeState,
} from "@openbeam/db";
import type { AdapterExecutionResult } from "@openbeam/types/control/adapters";
import { ControlServiceError } from "./errors";

const BLOCKED_AGENT_STATUSES = new Set([
  "PAUSED",
  "TERMINATED",
  "PENDING_APPROVAL",
]);
const DEFAULT_MAX_CONCURRENT_RUNS = 1;
const MAX_CONCURRENT_RUNS_CAP = 10;

interface WakeupOptions {
  source?: "TIMER" | "ASSIGNMENT" | "ON_DEMAND" | "AUTOMATION";
  triggerDetail?: string;
  reason?: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  requestedByActorType?: "USER" | "AGENT" | "SYSTEM";
  requestedByActorId?: string;
}

function parseHeartbeatPolicy(agent: { runtimeConfig: unknown }) {
  const config =
    agent.runtimeConfig && typeof agent.runtimeConfig === "object"
      ? (agent.runtimeConfig as Record<string, unknown>)
      : {};

  const enabled = config.heartbeatEnabled !== false;
  const intervalSec =
    typeof config.heartbeatIntervalSec === "number"
      ? config.heartbeatIntervalSec
      : 0;
  const wakeOnDemand = config.wakeOnDemand !== false;
  const rawMax =
    typeof config.maxConcurrentRuns === "number"
      ? config.maxConcurrentRuns
      : DEFAULT_MAX_CONCURRENT_RUNS;
  const maxConcurrentRuns = Math.min(
    Math.max(1, rawMax),
    MAX_CONCURRENT_RUNS_CAP
  );

  return { enabled, intervalSec, wakeOnDemand, maxConcurrentRuns };
}

export async function enqueueWakeup(
  db: Database,
  teamId: string,
  agentId: string,
  opts: WakeupOptions = {}
) {
  const agent = await findControlAgentById(db, agentId, teamId);
  if (!agent) {
    throw ControlServiceError.notFound("Agent");
  }

  if (BLOCKED_AGENT_STATUSES.has(agent.status)) {
    return null;
  }

  const policy = parseHeartbeatPolicy(agent);
  if (!policy.enabled) {
    return null;
  }

  if (opts.source === "ON_DEMAND" && !policy.wakeOnDemand) {
    return null;
  }

  const request = await createControlWakeupRequest(db, {
    teamId,
    agentId,
    source: opts.source ?? "ON_DEMAND",
    triggerDetail: opts.triggerDetail,
    reason: opts.reason,
    payload: opts.payload,
    requestedByActorType: opts.requestedByActorType as never,
    requestedByActorId: opts.requestedByActorId,
    idempotencyKey: opts.idempotencyKey,
  });

  const run = await createControlHeartbeatRun(db, {
    teamId,
    agentId,
    invocationSource: opts.source ?? "on_demand",
    triggerDetail: opts.triggerDetail,
    wakeupRequestId: request.id,
  });

  return { requestId: request.id, runId: run.id };
}

export async function claimAndStartRun(
  db: Database,
  params: {
    teamId: string;
    agentId: string;
    runId: string;
    wakeupRequestId: string;
  }
) {
  const { teamId, agentId, runId, wakeupRequestId } = params;

  await claimControlWakeupRequest(db, wakeupRequestId, runId);

  const runtimeState = await findControlAgentRuntimeState(db, agentId, teamId);
  const sessionIdBefore = runtimeState?.sessionId ?? undefined;

  await startControlHeartbeatRun(db, runId, sessionIdBefore);
  await updateControlAgentStatus(db, agentId, teamId, "RUNNING");
  await updateControlAgentHeartbeat(db, agentId, teamId);

  return { sessionIdBefore };
}

export async function completeRunWithResult(
  db: Database,
  params: {
    teamId: string;
    agentId: string;
    runId: string;
    wakeupRequestId: string;
    result: AdapterExecutionResult;
  }
) {
  const { teamId, agentId, runId, wakeupRequestId, result } = params;

  await completeControlHeartbeatRun(db, runId, {
    exitCode: result.exitCode ?? undefined,
    signal: result.signal ?? undefined,
    usageJson: result.usage,
    resultJson: result.resultJson,
    sessionIdAfter: result.sessionId ?? undefined,
    stdoutExcerpt: undefined,
    stderrExcerpt: undefined,
  });

  await completeControlWakeupRequest(db, wakeupRequestId);

  if (result.usage) {
    await accumulateCost(db, {
      teamId,
      agentId,
      result,
    });
  }

  await finalizeAgentStatus(db, teamId, agentId);
}

export async function failRunWithError(
  db: Database,
  params: {
    teamId: string;
    agentId: string;
    runId: string;
    wakeupRequestId: string;
    error: string;
    errorCode?: string;
  }
) {
  await failControlHeartbeatRun(
    db,
    params.runId,
    params.error,
    params.errorCode
  );
  await failControlWakeupRequest(db, params.wakeupRequestId, params.error);
  await finalizeAgentStatus(db, params.teamId, params.agentId);
}

async function accumulateCost(
  db: Database,
  params: {
    teamId: string;
    agentId: string;
    result: AdapterExecutionResult;
  }
) {
  const { teamId, agentId, result } = params;
  const usage = result.usage;
  if (!usage) {
    return;
  }

  const costCents = result.costUsd ? Math.round(result.costUsd * 100) : 0;

  if (
    costCents > 0 ||
    (usage.inputTokens ?? 0) > 0 ||
    (usage.outputTokens ?? 0) > 0
  ) {
    await createControlCostEvent(db, {
      teamId,
      agentId,
      provider: result.provider ?? "unknown",
      model: result.model ?? "unknown",
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      costCents,
      occurredAt: new Date(),
    });

    await incrementControlAgentRuntimeTokens(db, agentId, {
      inputTokens: BigInt(usage.inputTokens ?? 0),
      outputTokens: BigInt(usage.outputTokens ?? 0),
      cachedInputTokens: BigInt(usage.cachedInputTokens ?? 0),
      costCents: BigInt(costCents),
    });
  }

  const agent = await findControlAgentById(db, agentId, teamId);
  if (
    agent &&
    agent.budgetMonthlyCents > 0 &&
    agent.spentMonthlyCents >= agent.budgetMonthlyCents
  ) {
    await updateControlAgentStatus(db, agentId, teamId, "PAUSED");
  }
}

async function finalizeAgentStatus(
  db: Database,
  teamId: string,
  agentId: string
) {
  const runningRun = await findRunningHeartbeatRun(db, teamId, agentId);
  if (!runningRun) {
    const agent = await findControlAgentById(db, agentId, teamId);
    if (agent && agent.status === "RUNNING") {
      await updateControlAgentStatus(db, agentId, teamId, "IDLE");
    }
  }
}

export async function appendRunEvent(
  db: Database,
  params: {
    teamId: string;
    runId: string;
    agentId: string;
    seq: number;
    eventType: string;
    stream?: string;
    level?: string;
    message?: string;
    payload?: Record<string, unknown>;
  }
) {
  return await createControlHeartbeatRunEvent(db, {
    teamId: params.teamId,
    runId: params.runId,
    agentId: params.agentId,
    seq: params.seq,
    eventType: params.eventType,
    stream: params.stream,
    level: params.level,
    message: params.message,
    payload: params.payload,
  });
}

export async function reapOrphanedRuns(
  db: Database,
  teamId: string,
  staleThresholdMs = 600_000
) {
  const runs = await listControlHeartbeatRuns(db, teamId, "", {
    status: ["QUEUED", "RUNNING"] as never,
    limit: 100,
  });

  const now = Date.now();
  let reaped = 0;

  for (const run of runs) {
    const startTime = run.startedAt?.getTime() ?? run.createdAt.getTime();
    if (now - startTime > staleThresholdMs) {
      await failControlHeartbeatRun(
        db,
        run.id,
        "Run reaped as orphan",
        "orphan_reaped"
      );
      reaped += 1;
    }
  }

  return { checked: runs.length, reaped };
}

export async function ensureRuntimeState(
  db: Database,
  params: { agentId: string; teamId: string; adapterType: string }
) {
  return await upsertControlAgentRuntimeState(
    db,
    params.agentId,
    params.teamId,
    {
      adapterType: params.adapterType as never,
    }
  );
}

export async function updateRuntimeSession(
  db: Database,
  params: {
    agentId: string;
    teamId: string;
    adapterType: string;
    sessionId?: string;
    stateJson?: unknown;
    lastRunId?: string;
    lastRunStatus?: string;
  }
) {
  return await upsertControlAgentRuntimeState(
    db,
    params.agentId,
    params.teamId,
    {
      adapterType: params.adapterType as never,
      sessionId: params.sessionId,
      stateJson: params.stateJson,
      lastRunId: params.lastRunId,
      lastRunStatus: params.lastRunStatus,
    }
  );
}
