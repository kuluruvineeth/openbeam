import type {
  AgentStatus,
  ApprovalStatus,
  ApprovalType,
  ControlIssueStatus,
  HeartbeatRunStatus,
  JoinRequestStatus,
  WakeupStatus,
} from "../../prisma/generated/client";
import type { Database } from "../index";

// ── Agent Queries ──────────────────────────────────────────────────────────

export function findControlAgentById(db: Database, id: string, teamId: string) {
  return db.controlAgent.findFirst({
    where: { id, teamId },
    include: { runtimeState: true },
  });
}

export function findControlAgentWithRelations(
  db: Database,
  id: string,
  teamId: string
) {
  return db.controlAgent.findFirst({
    where: { id, teamId },
    include: {
      runtimeState: true,
      manager: { select: { id: true, name: true, role: true, icon: true } },
      reports: {
        select: { id: true, name: true, role: true, status: true, icon: true },
      },
    },
  });
}

export function listControlAgents(
  db: Database,
  teamId: string,
  options: {
    status?: AgentStatus | AgentStatus[];
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status, limit = 50, offset = 0 } = options;

  return db.controlAgent.findMany({
    where: {
      teamId,
      status: Array.isArray(status) ? { in: status } : status,
    },
    select: {
      id: true,
      name: true,
      role: true,
      title: true,
      icon: true,
      status: true,
      adapterType: true,
      budgetMonthlyCents: true,
      spentMonthlyCents: true,
      lastHeartbeatAt: true,
      reportsTo: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export function countControlAgents(
  db: Database,
  teamId: string,
  status?: AgentStatus | AgentStatus[]
) {
  return db.controlAgent.count({
    where: {
      teamId,
      status: Array.isArray(status) ? { in: status } : status,
    },
  });
}

export function findControlAgentOrgChart(db: Database, teamId: string) {
  return db.controlAgent.findMany({
    where: { teamId },
    select: {
      id: true,
      name: true,
      role: true,
      title: true,
      icon: true,
      status: true,
      reportsTo: true,
    },
    orderBy: { name: "asc" },
  });
}

// ── Agent API Key Queries ──────────────────────────────────────────────────

export function findControlAgentApiKeyByHash(db: Database, keyHash: string) {
  return db.controlAgentApiKey.findFirst({
    where: { keyHash, revokedAt: null },
    include: {
      agent: { select: { id: true, teamId: true, status: true, name: true } },
    },
  });
}

export function listControlAgentApiKeys(
  db: Database,
  teamId: string,
  agentId: string
) {
  return db.controlAgentApiKey.findMany({
    where: { teamId, agentId },
    select: {
      id: true,
      name: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// ── Agent Config Revision Queries ──────────────────────────────────────────

export function listControlAgentConfigRevisions(
  db: Database,
  teamId: string,
  agentId: string,
  limit = 20
) {
  return db.controlAgentConfigRevision.findMany({
    where: { teamId, agentId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ── Agent Runtime State Queries ────────────────────────────────────────────

export function findControlAgentRuntimeState(
  db: Database,
  agentId: string,
  teamId: string
) {
  return db.controlAgentRuntimeState.findFirst({
    where: { agentId, teamId },
  });
}

// ── Agent Task Session Queries ─────────────────────────────────────────────

export function listControlAgentTaskSessions(
  db: Database,
  teamId: string,
  agentId: string
) {
  return db.controlAgentTaskSession.findMany({
    where: { teamId, agentId },
    orderBy: { updatedAt: "desc" },
  });
}

export function findControlAgentTaskSession(
  db: Database,
  teamId: string,
  agentId: string,
  taskKey: string
) {
  return db.controlAgentTaskSession.findFirst({
    where: { teamId, agentId, taskKey },
  });
}

// ── Wakeup Request Queries ─────────────────────────────────────────────────

export function listControlWakeupRequests(
  db: Database,
  teamId: string,
  agentId: string,
  options: {
    status?: WakeupStatus | WakeupStatus[];
    limit?: number;
  } = {}
) {
  const { status, limit = 20 } = options;

  return db.controlAgentWakeupRequest.findMany({
    where: {
      teamId,
      agentId,
      status: Array.isArray(status) ? { in: status } : status,
    },
    orderBy: { requestedAt: "desc" },
    take: limit,
  });
}

export function findQueuedWakeupRequests(
  db: Database,
  teamId: string,
  agentId: string
) {
  return db.controlAgentWakeupRequest.findMany({
    where: { teamId, agentId, status: "QUEUED" },
    orderBy: { requestedAt: "asc" },
  });
}

// ── Heartbeat Run Queries ──────────────────────────────────────────────────

export function findControlHeartbeatRunById(
  db: Database,
  id: string,
  teamId: string
) {
  return db.controlHeartbeatRun.findFirst({
    where: { id, teamId },
    include: {
      events: { orderBy: { seq: "asc" } },
    },
  });
}

export function listControlHeartbeatRuns(
  db: Database,
  teamId: string,
  agentId: string,
  options: {
    status?: HeartbeatRunStatus | HeartbeatRunStatus[];
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status, limit = 20, offset = 0 } = options;

  return db.controlHeartbeatRun.findMany({
    where: {
      teamId,
      agentId,
      status: Array.isArray(status) ? { in: status } : status,
    },
    select: {
      id: true,
      invocationSource: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      exitCode: true,
      errorCode: true,
      externalRunId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export function findRunningHeartbeatRun(
  db: Database,
  teamId: string,
  agentId: string
) {
  return db.controlHeartbeatRun.findFirst({
    where: { teamId, agentId, status: "RUNNING" },
    orderBy: { startedAt: "desc" },
  });
}

// ── Heartbeat Run Event Queries ────────────────────────────────────────────

export function listControlHeartbeatRunEvents(
  db: Database,
  runId: string,
  options: { limit?: number; afterSeq?: number } = {}
) {
  const { limit = 100, afterSeq } = options;

  return db.controlHeartbeatRunEvent.findMany({
    where: {
      runId,
      seq: afterSeq !== undefined ? { gt: afterSeq } : undefined,
    },
    orderBy: { seq: "asc" },
    take: limit,
  });
}

// ── Issue Queries ──────────────────────────────────────────────────────────

export function findControlIssueById(db: Database, id: string, teamId: string) {
  return db.controlIssue.findFirst({
    where: { id, teamId },
    include: {
      assigneeAgent: {
        select: { id: true, name: true, icon: true, status: true },
      },
      project: { select: { id: true, name: true } },
      goal: { select: { id: true, title: true } },
      parent: { select: { id: true, title: true, identifier: true } },
      labelAssignments: { include: { label: true } },
    },
  });
}

export function findControlIssueByIdentifier(db: Database, identifier: string) {
  return db.controlIssue.findUnique({
    where: { identifier },
    include: {
      assigneeAgent: {
        select: { id: true, name: true, icon: true, status: true },
      },
      project: { select: { id: true, name: true } },
      labelAssignments: { include: { label: true } },
    },
  });
}

export function listControlIssues(
  db: Database,
  teamId: string,
  options: {
    status?: ControlIssueStatus | ControlIssueStatus[];
    assigneeAgentId?: string;
    projectId?: string;
    parentId?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const {
    status,
    assigneeAgentId,
    projectId,
    parentId,
    limit = 50,
    offset = 0,
  } = options;

  return db.controlIssue.findMany({
    where: {
      teamId,
      hiddenAt: null,
      status: Array.isArray(status) ? { in: status } : status,
      assigneeAgentId,
      projectId,
      parentId,
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      identifier: true,
      issueNumber: true,
      assigneeAgentId: true,
      assigneeUserId: true,
      projectId: true,
      parentId: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export function countControlIssues(
  db: Database,
  teamId: string,
  status?: ControlIssueStatus | ControlIssueStatus[]
) {
  return db.controlIssue.count({
    where: {
      teamId,
      hiddenAt: null,
      status: Array.isArray(status) ? { in: status } : status,
    },
  });
}

export function findCheckoutableIssue(
  db: Database,
  teamId: string,
  agentId: string
) {
  return db.controlIssue.findFirst({
    where: {
      teamId,
      assigneeAgentId: agentId,
      status: "TODO",
      checkoutRunId: null,
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
}

// ── Issue Comment Queries ──────────────────────────────────────────────────

export function listControlIssueComments(
  db: Database,
  teamId: string,
  issueId: string,
  limit = 50
) {
  return db.controlIssueComment.findMany({
    where: { teamId, issueId },
    include: {
      authorAgent: { select: { id: true, name: true, icon: true } },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

// ── Issue Label Queries ────────────────────────────────────────────────────

export function listControlIssueLabels(db: Database, teamId: string) {
  return db.controlIssueLabel.findMany({
    where: { teamId },
    orderBy: { name: "asc" },
  });
}

// ── Project Queries ────────────────────────────────────────────────────────

export function findControlProjectById(
  db: Database,
  id: string,
  teamId: string
) {
  return db.controlProject.findFirst({
    where: { id, teamId },
    include: {
      leadAgent: { select: { id: true, name: true, icon: true } },
      workspaces: true,
      goalLinks: { include: { goal: true } },
    },
  });
}

export function listControlProjects(
  db: Database,
  teamId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = options;

  return db.controlProject.findMany({
    where: { teamId, archivedAt: null },
    select: {
      id: true,
      name: true,
      status: true,
      leadAgentId: true,
      targetDate: true,
      color: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

// ── Goal Queries ───────────────────────────────────────────────────────────

export function findControlGoalById(db: Database, id: string, teamId: string) {
  return db.controlGoal.findFirst({
    where: { id, teamId },
    include: {
      parent: { select: { id: true, title: true } },
      children: { select: { id: true, title: true, status: true } },
      ownerAgent: { select: { id: true, name: true, icon: true } },
    },
  });
}

export function listControlGoals(
  db: Database,
  teamId: string,
  options: { level?: string; limit?: number } = {}
) {
  const { level, limit = 50 } = options;

  return db.controlGoal.findMany({
    where: {
      teamId,
      level: level as never,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ── Approval Queries ───────────────────────────────────────────────────────

export function findControlApprovalById(
  db: Database,
  id: string,
  teamId: string
) {
  return db.controlApproval.findFirst({
    where: { id, teamId },
    include: {
      requestedByAgent: { select: { id: true, name: true, icon: true } },
      comments: {
        include: {
          author: { select: { id: true, name: true, icon: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      issueLinks: {
        include: {
          issue: { select: { id: true, title: true, identifier: true } },
        },
      },
    },
  });
}

export function listControlApprovals(
  db: Database,
  teamId: string,
  options: {
    status?: ApprovalStatus;
    type?: ApprovalType;
    limit?: number;
  } = {}
) {
  const { status, type, limit = 20 } = options;

  return db.controlApproval.findMany({
    where: { teamId, status, type },
    include: {
      requestedByAgent: { select: { id: true, name: true, icon: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ── Cost Event Queries ─────────────────────────────────────────────────────

export function listControlCostEvents(
  db: Database,
  teamId: string,
  options: {
    agentId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
) {
  const { agentId, startDate, endDate, limit = 100 } = options;

  return db.controlCostEvent.findMany({
    where: {
      teamId,
      agentId,
      occurredAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { occurredAt: "desc" },
    take: limit,
  });
}

export function aggregateControlCosts(
  db: Database,
  teamId: string,
  options: { agentId?: string; startDate?: Date; endDate?: Date } = {}
) {
  const { agentId, startDate, endDate } = options;

  return db.controlCostEvent.aggregate({
    where: {
      teamId,
      agentId,
      occurredAt: { gte: startDate, lte: endDate },
    },
    _sum: { inputTokens: true, outputTokens: true, costCents: true },
    _count: true,
  });
}

// ── Activity Log Queries ───────────────────────────────────────────────────

export function listControlActivityLogs(
  db: Database,
  teamId: string,
  options: {
    entityType?: string;
    entityId?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { entityType, entityId, limit = 50, offset = 0 } = options;

  return db.controlActivityLog.findMany({
    where: { teamId, entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

// ── Team Secret Queries ────────────────────────────────────────────────────

export function listControlTeamSecrets(db: Database, teamId: string) {
  return db.controlTeamSecret.findMany({
    where: { teamId },
    select: {
      id: true,
      name: true,
      provider: true,
      latestVersion: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { name: "asc" },
  });
}

export function findControlTeamSecretByName(
  db: Database,
  teamId: string,
  name: string
) {
  return db.controlTeamSecret.findFirst({
    where: { teamId, name },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });
}

// ── Membership Queries ─────────────────────────────────────────────────────

export function listControlCompanyMemberships(
  db: Database,
  teamId: string,
  options: { status?: string } = {}
) {
  return db.controlCompanyMembership.findMany({
    where: {
      teamId,
      status: options.status as never,
    },
    orderBy: { createdAt: "desc" },
  });
}

export function findControlCompanyMembership(
  db: Database,
  teamId: string,
  principalType: string,
  principalId: string
) {
  return db.controlCompanyMembership.findFirst({
    where: {
      teamId,
      principalType: principalType as never,
      principalId,
    },
  });
}

// ── Access Grant Queries ───────────────────────────────────────────────────

export function listControlAccessGrants(
  db: Database,
  teamId: string,
  principalType: string,
  principalId: string
) {
  return db.controlAccessGrant.findMany({
    where: {
      teamId,
      principalType: principalType as never,
      principalId,
    },
    orderBy: { permissionKey: "asc" },
  });
}

export function hasControlPermission(
  db: Database,
  params: {
    teamId: string;
    principalType: string;
    principalId: string;
    permissionKey: string;
  }
) {
  return db.controlAccessGrant.count({
    where: {
      teamId: params.teamId,
      principalType: params.principalType as never,
      principalId: params.principalId,
      permissionKey: params.permissionKey,
    },
  });
}

// ── Invite Queries ─────────────────────────────────────────────────────────

export function findControlInviteByTokenHash(db: Database, tokenHash: string) {
  return db.controlInvite.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}

export function listControlInvites(db: Database, teamId: string) {
  return db.controlInvite.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
  });
}

// ── Join Request Queries ───────────────────────────────────────────────────

export function listControlJoinRequests(
  db: Database,
  teamId: string,
  status?: JoinRequestStatus
) {
  return db.controlJoinRequest.findMany({
    where: { teamId, status },
    orderBy: { createdAt: "desc" },
  });
}
