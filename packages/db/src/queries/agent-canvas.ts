import type { AgentCanvasStatus } from "../../prisma/generated/client";
import type { Database } from "../index";

export function findAgentCanvasById(db: Database, id: string, teamId: string) {
  return db.agentCanvas.findFirst({
    where: { id, teamId },
    include: {
      createdBy: {
        select: { id: true, name: true, image: true },
      },
    },
  });
}

export function findAgentCanvasWithVersions(
  db: Database,
  id: string,
  teamId: string
) {
  return db.agentCanvas.findFirst({
    where: { id, teamId },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 10,
      },
      createdBy: {
        select: { id: true, name: true, image: true },
      },
    },
  });
}

export function listAgentCanvases(
  db: Database,
  teamId: string,
  options: {
    status?: AgentCanvasStatus;
    createdById?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status, createdById, limit = 20, offset = 0 } = options;

  return db.agentCanvas.findMany({
    where: {
      teamId,
      ...(status && { status }),
      ...(createdById && { createdById }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      icon: true,
      status: true,
      version: true,
      triggerType: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      createdBy: {
        select: { id: true, name: true, image: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export function countAgentCanvases(
  db: Database,
  teamId: string,
  status?: AgentCanvasStatus
) {
  return db.agentCanvas.count({
    where: {
      teamId,
      ...(status && { status }),
    },
  });
}

export function findAgentCanvasVersion(
  db: Database,
  agentCanvasId: string,
  version: number
) {
  return db.agentCanvasVersion.findUnique({
    where: {
      agentCanvasId_version: { agentCanvasId, version },
    },
  });
}

export function listAgentCanvasVersions(
  db: Database,
  agentCanvasId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 20, offset = 0 } = options;

  return db.agentCanvasVersion.findMany({
    where: { agentCanvasId },
    orderBy: { version: "desc" },
    take: limit,
    skip: offset,
  });
}

export function findAgentCanvasExecution(
  db: Database,
  id: string,
  teamId: string
) {
  return db.agentCanvasExecution.findFirst({
    where: {
      id,
      agentCanvas: { teamId },
    },
    include: {
      steps: {
        orderBy: { createdAt: "asc" },
      },
      approvals: {
        orderBy: { requestedAt: "desc" },
      },
      triggeredBy: {
        select: { id: true, name: true, image: true },
      },
    },
  });
}

export function listAgentCanvasExecutions(
  db: Database,
  agentCanvasId: string,
  options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status, limit = 20, offset = 0 } = options;

  return db.agentCanvasExecution.findMany({
    where: {
      agentCanvasId,
      ...(status && { status: status as never }),
    },
    select: {
      id: true,
      versionNumber: true,
      status: true,
      currentNodeId: true,
      tokenUsage: true,
      latencyMs: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      triggeredBy: {
        select: { id: true, name: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export function findPendingApproval(
  db: Database,
  executionId: string,
  nodeId: string
) {
  return db.agentCanvasApproval.findFirst({
    where: {
      executionId,
      nodeId,
      status: "PENDING",
    },
  });
}

export function listPendingApprovals(db: Database, teamId: string) {
  return db.agentCanvasApproval.findMany({
    where: {
      status: "PENDING",
      execution: {
        agentCanvas: { teamId },
      },
      respondedById: null,
    },
    include: {
      execution: {
        select: {
          id: true,
          agentCanvas: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { requestedAt: "desc" },
  });
}

export function findAgentCanvasTemplate(db: Database, id: string) {
  return db.agentCanvasTemplate.findUnique({
    where: { id },
  });
}

export function listAgentCanvasTemplates(
  db: Database,
  options: {
    teamId?: string;
    category?: string;
    isPublic?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { teamId, category, isPublic, limit = 20, offset = 0 } = options;

  const visibilityFilters = [
    ...(isPublic === true ? [{ isPublic: true }] : []),
    ...(teamId ? [{ teamId }] : []),
  ];

  return db.agentCanvasTemplate.findMany({
    where: {
      ...(category && { category }),
      ...(visibilityFilters.length > 0 && { OR: visibilityFilters }),
    },
    orderBy: [{ usageCount: "desc" }, { createdAt: "desc" }],
    take: limit,
    skip: offset,
  });
}
