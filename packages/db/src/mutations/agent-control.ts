import type {
  AgentAdapterType,
  AgentStatus,
  ApprovalStatus,
  ApprovalType,
  ControlIssuePriority,
  ControlIssueStatus,
  ControlProjectStatus,
  GoalLevel,
  GoalStatus,
  HeartbeatRunStatus,
  InviteType,
  JoinRequestStatus,
  PrincipalType,
  SecretProvider,
  WakeupSource,
} from "../../prisma/generated/client";
import type { Database } from "../index";

// ── Agent Mutations ────────────────────────────────────────────────────────

export function createControlAgent(
  db: Database,
  data: {
    teamId: string;
    name: string;
    role?: string;
    title?: string;
    icon?: string;
    status?: AgentStatus;
    reportsTo?: string;
    capabilities?: string;
    adapterType?: AgentAdapterType;
    adapterConfig?: unknown;
    runtimeConfig?: unknown;
    budgetMonthlyCents?: number;
    permissions?: unknown;
    metadata?: unknown;
  }
) {
  return db.controlAgent.create({
    data: {
      teamId: data.teamId,
      name: data.name,
      role: data.role ?? "general",
      title: data.title,
      icon: data.icon,
      status: data.status ?? "IDLE",
      reportsTo: data.reportsTo,
      capabilities: data.capabilities,
      adapterType: data.adapterType ?? "PROCESS",
      adapterConfig: (data.adapterConfig as object) ?? {},
      runtimeConfig: (data.runtimeConfig as object) ?? {},
      budgetMonthlyCents: data.budgetMonthlyCents ?? 0,
      permissions: (data.permissions as object) ?? {},
      metadata: data.metadata as object | undefined,
    },
  });
}

export function updateControlAgentStatus(
  db: Database,
  id: string,
  teamId: string,
  status: AgentStatus
) {
  return db.controlAgent.updateMany({
    where: { id, teamId },
    data: { status },
  });
}

export function updateControlAgent(
  db: Database,
  id: string,
  teamId: string,
  data: {
    name?: string;
    role?: string;
    title?: string;
    icon?: string;
    reportsTo?: string | null;
    capabilities?: string;
    adapterType?: AgentAdapterType;
    adapterConfig?: unknown;
    runtimeConfig?: unknown;
    budgetMonthlyCents?: number;
    permissions?: unknown;
    metadata?: unknown;
  }
) {
  return db.controlAgent.updateMany({
    where: { id, teamId },
    data: {
      name: data.name,
      role: data.role,
      title: data.title,
      icon: data.icon,
      reportsTo: data.reportsTo,
      capabilities: data.capabilities,
      adapterType: data.adapterType,
      adapterConfig: data.adapterConfig as object | undefined,
      runtimeConfig: data.runtimeConfig as object | undefined,
      budgetMonthlyCents: data.budgetMonthlyCents,
      permissions: data.permissions as object | undefined,
      metadata: data.metadata as object | undefined,
    },
  });
}

export function updateControlAgentHeartbeat(
  db: Database,
  id: string,
  teamId: string
) {
  return db.controlAgent.updateMany({
    where: { id, teamId },
    data: { lastHeartbeatAt: new Date() },
  });
}

export function deleteControlAgent(db: Database, id: string, teamId: string) {
  return db.controlAgent.deleteMany({
    where: { id, teamId },
  });
}

// ── Agent API Key Mutations ────────────────────────────────────────────────

export function createControlAgentApiKey(
  db: Database,
  data: {
    teamId: string;
    agentId: string;
    name: string;
    keyHash: string;
  }
) {
  return db.controlAgentApiKey.create({ data });
}

export function revokeControlAgentApiKey(
  db: Database,
  id: string,
  teamId: string
) {
  return db.controlAgentApiKey.updateMany({
    where: { id, teamId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function touchControlAgentApiKey(db: Database, id: string) {
  return db.controlAgentApiKey.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  });
}

// ── Agent Config Revision Mutations ────────────────────────────────────────

export function createControlAgentConfigRevision(
  db: Database,
  data: {
    teamId: string;
    agentId: string;
    createdByAgentId?: string;
    createdByUserId?: string;
    source?: string;
    rolledBackFromRevisionId?: string;
    changedKeys: string[];
    beforeConfig: unknown;
    afterConfig: unknown;
  }
) {
  return db.controlAgentConfigRevision.create({
    data: {
      teamId: data.teamId,
      agentId: data.agentId,
      createdByAgentId: data.createdByAgentId,
      createdByUserId: data.createdByUserId,
      source: data.source ?? "patch",
      rolledBackFromRevisionId: data.rolledBackFromRevisionId,
      changedKeys: data.changedKeys as object,
      beforeConfig: data.beforeConfig as object,
      afterConfig: data.afterConfig as object,
    },
  });
}

// ── Agent Runtime State Mutations ──────────────────────────────────────────

export function upsertControlAgentRuntimeState(
  db: Database,
  agentId: string,
  teamId: string,
  data: {
    adapterType: AgentAdapterType;
    sessionId?: string;
    stateJson?: unknown;
    lastRunId?: string;
    lastRunStatus?: string;
  }
) {
  return db.controlAgentRuntimeState.upsert({
    where: { agentId },
    create: {
      agentId,
      teamId,
      adapterType: data.adapterType,
      sessionId: data.sessionId,
      stateJson: (data.stateJson as object) ?? {},
      lastRunId: data.lastRunId,
      lastRunStatus: data.lastRunStatus,
    },
    update: {
      sessionId: data.sessionId,
      stateJson: data.stateJson as object | undefined,
      lastRunId: data.lastRunId,
      lastRunStatus: data.lastRunStatus,
    },
  });
}

export function incrementControlAgentRuntimeTokens(
  db: Database,
  agentId: string,
  usage: {
    inputTokens: bigint;
    outputTokens: bigint;
    cachedInputTokens?: bigint;
    costCents: bigint;
  }
) {
  return db.controlAgentRuntimeState.update({
    where: { agentId },
    data: {
      totalInputTokens: { increment: usage.inputTokens },
      totalOutputTokens: { increment: usage.outputTokens },
      totalCachedInputTokens: { increment: usage.cachedInputTokens ?? 0n },
      totalCostCents: { increment: usage.costCents },
    },
  });
}

// ── Agent Task Session Mutations ───────────────────────────────────────────

export function upsertControlAgentTaskSession(
  db: Database,
  data: {
    teamId: string;
    agentId: string;
    adapterType: AgentAdapterType;
    taskKey: string;
    sessionParamsJson?: unknown;
    sessionDisplayId?: string;
    lastRunId?: string;
    lastError?: string;
  }
) {
  return db.controlAgentTaskSession.upsert({
    where: {
      teamId_agentId_adapterType_taskKey: {
        teamId: data.teamId,
        agentId: data.agentId,
        adapterType: data.adapterType,
        taskKey: data.taskKey,
      },
    },
    create: {
      teamId: data.teamId,
      agentId: data.agentId,
      adapterType: data.adapterType,
      taskKey: data.taskKey,
      sessionParamsJson: data.sessionParamsJson as object | undefined,
      sessionDisplayId: data.sessionDisplayId,
      lastRunId: data.lastRunId,
      lastError: data.lastError,
    },
    update: {
      sessionParamsJson: data.sessionParamsJson as object | undefined,
      sessionDisplayId: data.sessionDisplayId,
      lastRunId: data.lastRunId,
      lastError: data.lastError,
    },
  });
}

// ── Wakeup Request Mutations ───────────────────────────────────────────────

export function createControlWakeupRequest(
  db: Database,
  data: {
    teamId: string;
    agentId: string;
    source: WakeupSource;
    triggerDetail?: string;
    reason?: string;
    payload?: unknown;
    requestedByActorType?: PrincipalType;
    requestedByActorId?: string;
    idempotencyKey?: string;
  }
) {
  return db.controlAgentWakeupRequest.create({
    data: {
      teamId: data.teamId,
      agentId: data.agentId,
      source: data.source,
      triggerDetail: data.triggerDetail,
      reason: data.reason,
      payload: data.payload as object | undefined,
      requestedByActorType: data.requestedByActorType,
      requestedByActorId: data.requestedByActorId,
      idempotencyKey: data.idempotencyKey,
    },
  });
}

export function claimControlWakeupRequest(
  db: Database,
  id: string,
  runId: string
) {
  return db.controlAgentWakeupRequest.updateMany({
    where: { id, status: "QUEUED" },
    data: { status: "CLAIMED", claimedAt: new Date(), runId },
  });
}

export function completeControlWakeupRequest(db: Database, id: string) {
  return db.controlAgentWakeupRequest.updateMany({
    where: { id, status: "CLAIMED" },
    data: { status: "COMPLETED", finishedAt: new Date() },
  });
}

export function failControlWakeupRequest(
  db: Database,
  id: string,
  error: string
) {
  return db.controlAgentWakeupRequest.updateMany({
    where: { id, status: { in: ["QUEUED", "CLAIMED"] } },
    data: { status: "FAILED", finishedAt: new Date(), error },
  });
}

export function coalesceControlWakeupRequest(db: Database, id: string) {
  return db.controlAgentWakeupRequest.update({
    where: { id },
    data: { coalescedCount: { increment: 1 } },
  });
}

// ── Heartbeat Run Mutations ────────────────────────────────────────────────

export function createControlHeartbeatRun(
  db: Database,
  data: {
    teamId: string;
    agentId: string;
    invocationSource?: string;
    triggerDetail?: string;
    wakeupRequestId?: string;
    externalRunId?: string;
  }
) {
  return db.controlHeartbeatRun.create({
    data: {
      teamId: data.teamId,
      agentId: data.agentId,
      invocationSource: data.invocationSource ?? "on_demand",
      triggerDetail: data.triggerDetail,
      wakeupRequestId: data.wakeupRequestId,
      externalRunId: data.externalRunId,
    },
  });
}

export function startControlHeartbeatRun(
  db: Database,
  id: string,
  sessionIdBefore?: string
) {
  return db.controlHeartbeatRun.update({
    where: { id },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      sessionIdBefore,
    },
  });
}

export function completeControlHeartbeatRun(
  db: Database,
  id: string,
  data: {
    exitCode?: number;
    signal?: string;
    usageJson?: unknown;
    resultJson?: unknown;
    sessionIdAfter?: string;
    logRef?: string;
    logBytes?: bigint;
    logSha256?: string;
    logCompressed?: boolean;
    stdoutExcerpt?: string;
    stderrExcerpt?: string;
  }
) {
  return db.controlHeartbeatRun.update({
    where: { id },
    data: {
      status: "COMPLETED" as HeartbeatRunStatus,
      finishedAt: new Date(),
      exitCode: data.exitCode,
      signal: data.signal,
      usageJson: data.usageJson as object | undefined,
      resultJson: data.resultJson as object | undefined,
      sessionIdAfter: data.sessionIdAfter,
      logRef: data.logRef,
      logBytes: data.logBytes,
      logSha256: data.logSha256,
      logCompressed: data.logCompressed,
      stdoutExcerpt: data.stdoutExcerpt,
      stderrExcerpt: data.stderrExcerpt,
    },
  });
}

export function failControlHeartbeatRun(
  db: Database,
  id: string,
  error: string,
  errorCode?: string
) {
  return db.controlHeartbeatRun.update({
    where: { id },
    data: {
      status: "FAILED" as HeartbeatRunStatus,
      finishedAt: new Date(),
      error,
      errorCode,
    },
  });
}

// ── Heartbeat Run Event Mutations ──────────────────────────────────────────

export function createControlHeartbeatRunEvent(
  db: Database,
  data: {
    teamId: string;
    runId: string;
    agentId: string;
    seq: number;
    eventType: string;
    stream?: string;
    level?: string;
    color?: string;
    message?: string;
    payload?: unknown;
  }
) {
  return db.controlHeartbeatRunEvent.create({
    data: {
      teamId: data.teamId,
      runId: data.runId,
      agentId: data.agentId,
      seq: data.seq,
      eventType: data.eventType,
      stream: data.stream,
      level: data.level,
      color: data.color,
      message: data.message,
      payload: data.payload as object | undefined,
    },
  });
}

// ── Asset Mutations ────────────────────────────────────────────────────────

export function createControlAsset(
  db: Database,
  data: {
    teamId: string;
    provider: string;
    objectKey: string;
    contentType: string;
    byteSize: number;
    sha256: string;
    originalFilename?: string;
    createdByAgentId?: string;
    createdByUserId?: string;
  }
) {
  return db.controlAsset.create({ data });
}

// ── Issue Mutations ────────────────────────────────────────────────────────

export function createControlIssue(
  db: Database,
  data: {
    teamId: string;
    title: string;
    description?: string;
    status?: ControlIssueStatus;
    priority?: ControlIssuePriority;
    projectId?: string;
    goalId?: string;
    parentId?: string;
    assigneeAgentId?: string;
    assigneeUserId?: string;
    createdByAgentId?: string;
    createdByUserId?: string;
    issueNumber?: number;
    identifier?: string;
    billingCode?: string;
    requestDepth?: number;
  }
) {
  return db.controlIssue.create({
    data: {
      teamId: data.teamId,
      title: data.title,
      description: data.description,
      status: data.status ?? "BACKLOG",
      priority: data.priority ?? "MEDIUM",
      projectId: data.projectId,
      goalId: data.goalId,
      parentId: data.parentId,
      assigneeAgentId: data.assigneeAgentId,
      assigneeUserId: data.assigneeUserId,
      createdByAgentId: data.createdByAgentId,
      createdByUserId: data.createdByUserId,
      issueNumber: data.issueNumber,
      identifier: data.identifier,
      billingCode: data.billingCode,
      requestDepth: data.requestDepth ?? 0,
    },
  });
}

export function updateControlIssueStatus(
  db: Database,
  id: string,
  teamId: string,
  status: ControlIssueStatus
) {
  const timestamps: Record<string, Date> = {};
  if (status === "IN_PROGRESS") {
    timestamps.startedAt = new Date();
  }
  if (status === "DONE") {
    timestamps.completedAt = new Date();
  }
  if (status === "CANCELLED") {
    timestamps.cancelledAt = new Date();
  }

  return db.controlIssue.updateMany({
    where: { id, teamId },
    data: { status, ...timestamps },
  });
}

export function updateControlIssue(
  db: Database,
  id: string,
  teamId: string,
  data: {
    title?: string;
    description?: string;
    priority?: ControlIssuePriority;
    assigneeAgentId?: string | null;
    assigneeUserId?: string | null;
    projectId?: string | null;
    goalId?: string | null;
    parentId?: string | null;
    billingCode?: string | null;
  }
) {
  return db.controlIssue.updateMany({
    where: { id, teamId },
    data,
  });
}

export function checkoutControlIssue(
  db: Database,
  params: {
    id: string;
    teamId: string;
    runId: string;
    agentNameKey: string;
  }
) {
  return db.controlIssue.updateMany({
    where: { id: params.id, teamId: params.teamId, checkoutRunId: null },
    data: {
      status: "IN_PROGRESS",
      checkoutRunId: params.runId,
      executionRunId: params.runId,
      executionAgentNameKey: params.agentNameKey,
      executionLockedAt: new Date(),
      startedAt: new Date(),
    },
  });
}

export function releaseControlIssueCheckout(
  db: Database,
  id: string,
  teamId: string
) {
  return db.controlIssue.updateMany({
    where: { id, teamId },
    data: {
      checkoutRunId: null,
      executionLockedAt: null,
    },
  });
}

export function hideControlIssue(db: Database, id: string, teamId: string) {
  return db.controlIssue.updateMany({
    where: { id, teamId },
    data: { hiddenAt: new Date() },
  });
}

// ── Issue Comment Mutations ────────────────────────────────────────────────

export function createControlIssueComment(
  db: Database,
  data: {
    teamId: string;
    issueId: string;
    authorAgentId?: string;
    authorUserId?: string;
    body: string;
  }
) {
  return db.controlIssueComment.create({ data });
}

// ── Issue Label Mutations ──────────────────────────────────────────────────

export function createControlIssueLabel(
  db: Database,
  data: { teamId: string; name: string; color: string }
) {
  return db.controlIssueLabel.create({ data });
}

export function assignControlIssueLabel(
  db: Database,
  data: { teamId: string; issueId: string; labelId: string }
) {
  return db.controlIssueLabelAssignment.create({ data });
}

export function removeControlIssueLabel(
  db: Database,
  issueId: string,
  labelId: string
) {
  return db.controlIssueLabelAssignment.deleteMany({
    where: { issueId, labelId },
  });
}

// ── Issue Attachment Mutations ─────────────────────────────────────────────

export function createControlIssueAttachment(
  db: Database,
  data: {
    teamId: string;
    issueId: string;
    assetId: string;
    issueCommentId?: string;
  }
) {
  return db.controlIssueAttachment.create({ data });
}

// ── Project Mutations ──────────────────────────────────────────────────────

export function createControlProject(
  db: Database,
  data: {
    teamId: string;
    name: string;
    description?: string;
    status?: ControlProjectStatus;
    goalId?: string;
    leadAgentId?: string;
    targetDate?: Date;
    color?: string;
  }
) {
  return db.controlProject.create({
    data: {
      teamId: data.teamId,
      name: data.name,
      description: data.description,
      status: data.status ?? "BACKLOG",
      goalId: data.goalId,
      leadAgentId: data.leadAgentId,
      targetDate: data.targetDate,
      color: data.color,
    },
  });
}

export function updateControlProject(
  db: Database,
  id: string,
  teamId: string,
  data: {
    name?: string;
    description?: string;
    status?: ControlProjectStatus;
    leadAgentId?: string | null;
    targetDate?: Date | null;
    color?: string | null;
  }
) {
  return db.controlProject.updateMany({
    where: { id, teamId },
    data,
  });
}

export function archiveControlProject(
  db: Database,
  id: string,
  teamId: string
) {
  return db.controlProject.updateMany({
    where: { id, teamId },
    data: { archivedAt: new Date() },
  });
}

// ── Project Workspace Mutations ────────────────────────────────────────────

export function createControlProjectWorkspace(
  db: Database,
  data: {
    teamId: string;
    projectId: string;
    name: string;
    cwd?: string;
    repoUrl?: string;
    repoRef?: string;
    metadata?: unknown;
    isPrimary?: boolean;
  }
) {
  return db.controlProjectWorkspace.create({
    data: {
      teamId: data.teamId,
      projectId: data.projectId,
      name: data.name,
      cwd: data.cwd,
      repoUrl: data.repoUrl,
      repoRef: data.repoRef,
      metadata: data.metadata as object | undefined,
      isPrimary: data.isPrimary ?? false,
    },
  });
}

// ── Project Goal Mutations ─────────────────────────────────────────────────

export function linkControlProjectGoal(
  db: Database,
  data: { teamId: string; projectId: string; goalId: string }
) {
  return db.controlProjectGoal.create({ data });
}

export function unlinkControlProjectGoal(
  db: Database,
  projectId: string,
  goalId: string
) {
  return db.controlProjectGoal.deleteMany({
    where: { projectId, goalId },
  });
}

// ── Goal Mutations ─────────────────────────────────────────────────────────

export function createControlGoal(
  db: Database,
  data: {
    teamId: string;
    title: string;
    description?: string;
    level?: GoalLevel;
    status?: GoalStatus;
    parentId?: string;
    ownerAgentId?: string;
  }
) {
  return db.controlGoal.create({
    data: {
      teamId: data.teamId,
      title: data.title,
      description: data.description,
      level: data.level ?? "TASK",
      status: data.status ?? "PLANNED",
      parentId: data.parentId,
      ownerAgentId: data.ownerAgentId,
    },
  });
}

export function updateControlGoal(
  db: Database,
  id: string,
  teamId: string,
  data: {
    title?: string;
    description?: string;
    level?: GoalLevel;
    status?: GoalStatus;
    parentId?: string | null;
    ownerAgentId?: string | null;
  }
) {
  return db.controlGoal.updateMany({
    where: { id, teamId },
    data,
  });
}

// ── Approval Mutations ─────────────────────────────────────────────────────

export function createControlApproval(
  db: Database,
  data: {
    teamId: string;
    type: ApprovalType;
    requestedByAgentId?: string;
    requestedByUserId?: string;
    payload: unknown;
  }
) {
  return db.controlApproval.create({
    data: {
      teamId: data.teamId,
      type: data.type,
      requestedByAgentId: data.requestedByAgentId,
      requestedByUserId: data.requestedByUserId,
      payload: data.payload as object,
    },
  });
}

export function resolveControlApproval(
  db: Database,
  id: string,
  teamId: string,
  data: {
    status: ApprovalStatus;
    decidedByUserId: string;
    decisionNote?: string;
  }
) {
  return db.controlApproval.updateMany({
    where: { id, teamId, status: "PENDING" },
    data: {
      status: data.status,
      decidedByUserId: data.decidedByUserId,
      decisionNote: data.decisionNote,
      decidedAt: new Date(),
    },
  });
}

// ── Approval Comment Mutations ─────────────────────────────────────────────

export function createControlApprovalComment(
  db: Database,
  data: {
    teamId: string;
    approvalId: string;
    authorAgentId?: string;
    authorUserId?: string;
    body: string;
  }
) {
  return db.controlApprovalComment.create({ data });
}

// ── Issue Approval Mutations ───────────────────────────────────────────────

export function linkControlIssueApproval(
  db: Database,
  data: { teamId: string; issueId: string; approvalId: string }
) {
  return db.controlIssueApproval.create({ data });
}

// ── Cost Event Mutations ───────────────────────────────────────────────────

export function createControlCostEvent(
  db: Database,
  data: {
    teamId: string;
    agentId: string;
    issueId?: string;
    projectId?: string;
    goalId?: string;
    billingCode?: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costCents: number;
    occurredAt: Date;
  }
) {
  return db.controlCostEvent.create({ data });
}

// ── Activity Log Mutations ─────────────────────────────────────────────────

export function createControlActivityLog(
  db: Database,
  data: {
    teamId: string;
    actorType?: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    agentId?: string;
    runId?: string;
    details?: unknown;
  }
) {
  return db.controlActivityLog.create({
    data: {
      teamId: data.teamId,
      actorType: data.actorType ?? "system",
      actorId: data.actorId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      agentId: data.agentId,
      runId: data.runId,
      details: data.details as object | undefined,
    },
  });
}

// ── Team Secret Mutations ──────────────────────────────────────────────────

export function createControlTeamSecret(
  db: Database,
  data: {
    teamId: string;
    name: string;
    provider?: SecretProvider;
    externalRef?: string;
    description?: string;
    createdByAgentId?: string;
    createdByUserId?: string;
  }
) {
  return db.controlTeamSecret.create({
    data: {
      teamId: data.teamId,
      name: data.name,
      provider: data.provider ?? "LOCAL_ENCRYPTED",
      externalRef: data.externalRef,
      description: data.description,
      createdByAgentId: data.createdByAgentId,
      createdByUserId: data.createdByUserId,
    },
  });
}

export function createControlTeamSecretVersion(
  db: Database,
  data: {
    secretId: string;
    version: number;
    material: unknown;
    valueSha256: string;
    createdByAgentId?: string;
    createdByUserId?: string;
  }
) {
  return db.controlTeamSecretVersion.create({
    data: {
      secretId: data.secretId,
      version: data.version,
      material: data.material as object,
      valueSha256: data.valueSha256,
      createdByAgentId: data.createdByAgentId,
      createdByUserId: data.createdByUserId,
    },
  });
}

export function revokeControlTeamSecretVersion(
  db: Database,
  secretId: string,
  version: number
) {
  return db.controlTeamSecretVersion.updateMany({
    where: { secretId, version, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ── Membership Mutations ───────────────────────────────────────────────────

export function upsertControlCompanyMembership(
  db: Database,
  data: {
    teamId: string;
    principalType: PrincipalType;
    principalId: string;
    membershipRole?: string;
  }
) {
  return db.controlCompanyMembership.upsert({
    where: {
      teamId_principalType_principalId: {
        teamId: data.teamId,
        principalType: data.principalType,
        principalId: data.principalId,
      },
    },
    create: {
      teamId: data.teamId,
      principalType: data.principalType,
      principalId: data.principalId,
      membershipRole: data.membershipRole as never,
    },
    update: {
      membershipRole: data.membershipRole as never,
    },
  });
}

export function suspendControlCompanyMembership(
  db: Database,
  teamId: string,
  principalType: PrincipalType,
  principalId: string
) {
  return db.controlCompanyMembership.updateMany({
    where: { teamId, principalType, principalId, status: "ACTIVE" },
    data: { status: "SUSPENDED" },
  });
}

// ── Access Grant Mutations ─────────────────────────────────────────────────

export function grantControlPermission(
  db: Database,
  data: {
    teamId: string;
    principalType: PrincipalType;
    principalId: string;
    permissionKey: string;
    scope?: unknown;
    grantedByUserId?: string;
  }
) {
  return db.controlAccessGrant.upsert({
    where: {
      teamId_principalType_principalId_permissionKey: {
        teamId: data.teamId,
        principalType: data.principalType,
        principalId: data.principalId,
        permissionKey: data.permissionKey,
      },
    },
    create: {
      teamId: data.teamId,
      principalType: data.principalType,
      principalId: data.principalId,
      permissionKey: data.permissionKey,
      scope: data.scope as object | undefined,
      grantedByUserId: data.grantedByUserId,
    },
    update: {
      scope: data.scope as object | undefined,
      grantedByUserId: data.grantedByUserId,
    },
  });
}

export function revokeControlPermission(
  db: Database,
  params: {
    teamId: string;
    principalType: PrincipalType;
    principalId: string;
    permissionKey: string;
  }
) {
  return db.controlAccessGrant.deleteMany({
    where: params,
  });
}

// ── Invite Mutations ───────────────────────────────────────────────────────

export function createControlInvite(
  db: Database,
  data: {
    teamId?: string;
    inviteType?: InviteType;
    tokenHash: string;
    allowedJoinTypes?: string;
    defaultsPayload?: unknown;
    expiresAt: Date;
    invitedByUserId?: string;
  }
) {
  return db.controlInvite.create({
    data: {
      teamId: data.teamId,
      inviteType: data.inviteType ?? "USER",
      tokenHash: data.tokenHash,
      allowedJoinTypes: data.allowedJoinTypes ?? "both",
      defaultsPayload: data.defaultsPayload as object | undefined,
      expiresAt: data.expiresAt,
      invitedByUserId: data.invitedByUserId,
    },
  });
}

export function revokeControlInvite(db: Database, id: string, teamId: string) {
  return db.controlInvite.updateMany({
    where: { id, teamId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export function acceptControlInvite(db: Database, id: string) {
  return db.controlInvite.update({
    where: { id },
    data: { acceptedAt: new Date() },
  });
}

// ── Join Request Mutations ─────────────────────────────────────────────────

export function createControlJoinRequest(
  db: Database,
  data: {
    inviteId: string;
    teamId: string;
    requestType: string;
    requestIp: string;
    requestingUserId?: string;
    requestEmailSnapshot?: string;
    agentName?: string;
    adapterType?: AgentAdapterType;
    capabilities?: string;
    agentDefaultsPayload?: unknown;
  }
) {
  return db.controlJoinRequest.create({
    data: {
      inviteId: data.inviteId,
      teamId: data.teamId,
      requestType: data.requestType,
      requestIp: data.requestIp,
      requestingUserId: data.requestingUserId,
      requestEmailSnapshot: data.requestEmailSnapshot,
      agentName: data.agentName,
      adapterType: data.adapterType,
      capabilities: data.capabilities,
      agentDefaultsPayload: data.agentDefaultsPayload as object | undefined,
    },
  });
}

export function approveControlJoinRequest(
  db: Database,
  id: string,
  approvedByUserId: string,
  createdAgentId?: string
) {
  return db.controlJoinRequest.updateMany({
    where: { id, status: "PENDING" },
    data: {
      status: "APPROVED" as JoinRequestStatus,
      approvedByUserId,
      approvedAt: new Date(),
      createdAgentId,
    },
  });
}

export function rejectControlJoinRequest(
  db: Database,
  id: string,
  rejectedByUserId: string
) {
  return db.controlJoinRequest.updateMany({
    where: { id, status: "PENDING" },
    data: {
      status: "REJECTED" as JoinRequestStatus,
      rejectedByUserId,
      rejectedAt: new Date(),
    },
  });
}

// ── Team Budget Mutations ──────────────────────────────────────────────────

export function updateTeamBudget(
  db: Database,
  teamId: string,
  budgetMonthlyCents: number
) {
  return db.team.update({
    where: { id: teamId },
    data: { budgetMonthlyCents },
  });
}

export function incrementTeamConsumedCents(
  db: Database,
  teamId: string,
  cents: number
) {
  return db.team.update({
    where: { id: teamId },
    data: { consumedMonthlyCents: { increment: cents } },
  });
}

export function incrementTeamIssueCounter(db: Database, teamId: string) {
  return db.team.update({
    where: { id: teamId },
    data: { issueCounter: { increment: 1 } },
    select: { issueCounter: true, issuePrefix: true },
  });
}
