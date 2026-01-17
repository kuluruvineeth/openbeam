import type {
  AgentCanvasApprovalStatus,
  AgentCanvasExecutionStatus,
  AgentTriggerType,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export function createAgentCanvas(
  db: Database,
  data: {
    name: string;
    description?: string;
    icon?: string;
    nodes: unknown;
    edges: unknown;
    viewport?: unknown;
    settings?: unknown;
    triggerType?: AgentTriggerType;
    triggerConfig?: unknown;
    teamId: string;
    createdById: string;
  }
) {
  return db.agentCanvas.create({
    data: {
      name: data.name,
      description: data.description,
      icon: data.icon,
      nodes: data.nodes as never,
      edges: data.edges as never,
      viewport: data.viewport as never,
      settings: data.settings as never,
      triggerType: data.triggerType,
      triggerConfig: data.triggerConfig as never,
      teamId: data.teamId,
      createdById: data.createdById,
    },
  });
}

export function updateAgentCanvas(
  db: Database,
  id: string,
  teamId: string,
  data: {
    name?: string;
    description?: string;
    icon?: string;
    nodes?: unknown;
    edges?: unknown;
    viewport?: unknown;
    settings?: unknown;
    triggerType?: AgentTriggerType;
    triggerConfig?: unknown;
  }
) {
  return db.$transaction(async (tx) => {
    const canvas = await tx.agentCanvas.findFirst({
      where: { id, teamId },
      select: { id: true },
    });

    if (!canvas) {
      throw new Error("Agent canvas not found");
    }

    return tx.agentCanvas.update({
      where: { id: canvas.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.nodes !== undefined && { nodes: data.nodes as never }),
        ...(data.edges !== undefined && { edges: data.edges as never }),
        ...(data.viewport !== undefined && {
          viewport: data.viewport as never,
        }),
        ...(data.settings !== undefined && {
          settings: data.settings as never,
        }),
        ...(data.triggerType !== undefined && {
          triggerType: data.triggerType,
        }),
        ...(data.triggerConfig !== undefined && {
          triggerConfig: data.triggerConfig as never,
        }),
        updatedAt: new Date(),
      },
    });
  });
}

export function publishAgentCanvas(
  db: Database,
  id: string,
  teamId: string,
  changelog?: string
) {
  return db.$transaction(async (tx) => {
    const canvas = await tx.agentCanvas.findFirst({
      where: { id, teamId },
    });

    if (!canvas) {
      throw new Error("Agent canvas not found");
    }

    await tx.agentCanvasVersion.create({
      data: {
        agentCanvasId: id,
        version: canvas.version,
        nodes: canvas.nodes as never,
        edges: canvas.edges as never,
        viewport: canvas.viewport as never,
        settings: canvas.settings as never,
        changelog,
        createdById: canvas.createdById,
      },
    });

    return tx.agentCanvas.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        version: { increment: 1 },
        publishedAt: new Date(),
      },
    });
  });
}

export function archiveAgentCanvas(db: Database, id: string, teamId: string) {
  return db.$transaction(async (tx) => {
    const canvas = await tx.agentCanvas.findFirst({
      where: { id, teamId },
      select: { id: true },
    });

    if (!canvas) {
      throw new Error("Agent canvas not found");
    }

    return tx.agentCanvas.update({
      where: { id: canvas.id },
      data: { status: "ARCHIVED" },
    });
  });
}

export function deleteAgentCanvas(db: Database, id: string, teamId: string) {
  return db.agentCanvas.deleteMany({
    where: { id, teamId },
  });
}

export function createAgentCanvasExecution(
  db: Database,
  data: {
    agentCanvasId: string;
    versionNumber: number;
    input?: unknown;
    trace: unknown;
    triggeredById: string;
    triggerSource?: string;
  }
) {
  return db.agentCanvasExecution.create({
    data: {
      agentCanvasId: data.agentCanvasId,
      versionNumber: data.versionNumber,
      input: data.input as never,
      trace: data.trace as never,
      triggeredById: data.triggeredById,
      triggerSource: data.triggerSource,
    },
  });
}

export function updateAgentCanvasExecution(
  db: Database,
  id: string,
  data: {
    status?: AgentCanvasExecutionStatus;
    currentNodeId?: string | null;
    output?: unknown;
    error?: string;
    trace?: unknown;
    tokenUsage?: unknown;
    latencyMs?: number;
    startedAt?: Date;
    completedAt?: Date;
  }
) {
  return db.agentCanvasExecution.update({
    where: { id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.currentNodeId !== undefined && {
        currentNodeId: data.currentNodeId,
      }),
      ...(data.output !== undefined && { output: data.output as never }),
      ...(data.error !== undefined && { error: data.error }),
      ...(data.trace !== undefined && { trace: data.trace as never }),
      ...(data.tokenUsage !== undefined && {
        tokenUsage: data.tokenUsage as never,
      }),
      ...(data.latencyMs !== undefined && { latencyMs: data.latencyMs }),
      ...(data.startedAt !== undefined && { startedAt: data.startedAt }),
      ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
    },
  });
}

export function createAgentCanvasExecutionStep(
  db: Database,
  data: {
    executionId: string;
    nodeId: string;
    nodeType: string;
    status: AgentCanvasExecutionStatus;
    input?: unknown;
    output?: unknown;
    error?: string;
    tokenUsage?: unknown;
    latencyMs?: number;
    startedAt?: Date;
    completedAt?: Date;
  }
) {
  return db.agentCanvasExecutionStep.create({
    data: {
      executionId: data.executionId,
      nodeId: data.nodeId,
      nodeType: data.nodeType,
      status: data.status,
      input: data.input as never,
      output: data.output as never,
      error: data.error,
      tokenUsage: data.tokenUsage as never,
      latencyMs: data.latencyMs,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
    },
  });
}

export function updateAgentCanvasExecutionStep(
  db: Database,
  id: string,
  data: {
    status?: AgentCanvasExecutionStatus;
    output?: unknown;
    error?: string;
    tokenUsage?: unknown;
    latencyMs?: number;
    completedAt?: Date;
  }
) {
  return db.agentCanvasExecutionStep.update({
    where: { id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.output !== undefined && { output: data.output as never }),
      ...(data.error !== undefined && { error: data.error }),
      ...(data.tokenUsage !== undefined && {
        tokenUsage: data.tokenUsage as never,
      }),
      ...(data.latencyMs !== undefined && { latencyMs: data.latencyMs }),
      ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
    },
  });
}

export function createAgentCanvasApproval(
  db: Database,
  data: {
    executionId: string;
    nodeId: string;
    requestMessage?: string;
    expiresAt?: Date;
  }
) {
  return db.agentCanvasApproval.create({
    data: {
      executionId: data.executionId,
      nodeId: data.nodeId,
      requestMessage: data.requestMessage,
      expiresAt: data.expiresAt,
    },
  });
}

export function respondToApproval(
  db: Database,
  id: string,
  data: {
    status: AgentCanvasApprovalStatus;
    responseMessage?: string;
    respondedById: string;
  }
) {
  return db.agentCanvasApproval.update({
    where: { id },
    data: {
      status: data.status,
      responseMessage: data.responseMessage,
      respondedById: data.respondedById,
      respondedAt: new Date(),
    },
  });
}

export function createAgentCanvasTemplate(
  db: Database,
  data: {
    name: string;
    description?: string;
    icon?: string;
    category: string;
    nodes: unknown;
    edges: unknown;
    settings?: unknown;
    requiredConnectors?: string[];
    requiredTools?: string[];
    variables?: unknown;
    isPublic?: boolean;
    teamId?: string;
    createdById: string;
  }
) {
  return db.agentCanvasTemplate.create({
    data: {
      name: data.name,
      description: data.description,
      icon: data.icon,
      category: data.category,
      nodes: data.nodes as never,
      edges: data.edges as never,
      settings: data.settings as never,
      requiredConnectors: data.requiredConnectors ?? [],
      requiredTools: data.requiredTools ?? [],
      variables: data.variables as never,
      isPublic: data.isPublic ?? false,
      teamId: data.teamId,
      createdById: data.createdById,
    },
  });
}

export function incrementTemplateUsage(db: Database, id: string) {
  return db.agentCanvasTemplate.update({
    where: { id },
    data: { usageCount: { increment: 1 } },
  });
}
