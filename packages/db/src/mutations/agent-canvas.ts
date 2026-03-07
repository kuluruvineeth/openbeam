import {
  AgentCanvasEdgeSchema,
  AgentCanvasNodeSchema,
} from "@openbeam/types/canvas";
import type {
  AgentCanvasApprovalStatus,
  AgentCanvasExecutionStatus,
  AgentTriggerType,
  Prisma,
} from "../../prisma/generated/client";
import type { Database } from "../index";

type TransactionClient = Parameters<Parameters<Database["$transaction"]>[0]>[0];

async function verifyCanvasOwnership(
  tx: TransactionClient,
  id: string,
  teamId: string
) {
  const canvas = await tx.agentCanvas.findFirst({
    where: { id, teamId },
    select: { id: true },
  });

  if (!canvas) {
    throw new Error("Agent canvas not found");
  }

  return canvas;
}

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
  const validatedNodes = AgentCanvasNodeSchema.array().parse(data.nodes);
  const validatedEdges = AgentCanvasEdgeSchema.array().parse(data.edges);

  return db.agentCanvas.create({
    data: {
      name: data.name,
      description: data.description,
      icon: data.icon,
      nodes: validatedNodes as Prisma.InputJsonValue,
      edges: validatedEdges as Prisma.InputJsonValue,
      viewport: data.viewport as Prisma.InputJsonValue,
      settings: data.settings as Prisma.InputJsonValue,
      triggerType: data.triggerType,
      triggerConfig: data.triggerConfig as Prisma.InputJsonValue,
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
    const canvas = await verifyCanvasOwnership(tx, id, teamId);

    const updateData: Prisma.AgentCanvasUpdateInput = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.icon !== undefined) {
      updateData.icon = data.icon;
    }
    if (data.triggerType !== undefined) {
      updateData.triggerType = data.triggerType;
    }

    if (data.nodes !== undefined) {
      const validatedNodes = AgentCanvasNodeSchema.array().parse(data.nodes);
      updateData.nodes = validatedNodes as Prisma.InputJsonValue;
    }

    if (data.edges !== undefined) {
      const validatedEdges = AgentCanvasEdgeSchema.array().parse(data.edges);
      updateData.edges = validatedEdges as Prisma.InputJsonValue;
    }

    if (data.viewport !== undefined) {
      updateData.viewport = data.viewport as Prisma.InputJsonValue;
    }

    if (data.settings !== undefined) {
      updateData.settings = data.settings as Prisma.InputJsonValue;
    }

    if (data.triggerConfig !== undefined) {
      updateData.triggerConfig = data.triggerConfig as Prisma.InputJsonValue;
    }

    return tx.agentCanvas.update({
      where: { id: canvas.id },
      data: updateData,
    });
  });
}

export function publishAgentCanvas(
  db: Database,
  id: string,
  teamId: string,
  options: {
    publishedById: string;
    changelog?: string;
  }
) {
  return db.$transaction(async (tx) => {
    const canvas = await tx.agentCanvas.findFirst({
      where: { id, teamId },
    });

    if (!canvas) {
      throw new Error("Agent canvas not found");
    }

    const validatedNodes = AgentCanvasNodeSchema.array().parse(canvas.nodes);
    const validatedEdges = AgentCanvasEdgeSchema.array().parse(canvas.edges);

    const updatedCanvas = await tx.agentCanvas.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        version: { increment: 1 },
        publishedAt: new Date(),
      },
    });

    await tx.agentCanvasVersion.create({
      data: {
        agentCanvasId: id,
        version: updatedCanvas.version,
        nodes: validatedNodes as Prisma.InputJsonValue,
        edges: validatedEdges as Prisma.InputJsonValue,
        viewport: canvas.viewport as Prisma.InputJsonValue,
        settings: canvas.settings as Prisma.InputJsonValue,
        changelog: options.changelog,
        createdById: options.publishedById,
      },
    });

    return updatedCanvas;
  });
}

export function archiveAgentCanvas(db: Database, id: string, teamId: string) {
  return db.$transaction(async (tx) => {
    const canvas = await verifyCanvasOwnership(tx, id, teamId);

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

export function duplicateAgentCanvas(
  db: Database,
  id: string,
  teamId: string,
  options: {
    name?: string;
    createdById: string;
  }
) {
  return db.$transaction(async (tx) => {
    const canvas = await tx.agentCanvas.findFirst({
      where: { id, teamId },
    });

    if (!canvas) {
      throw new Error("Agent canvas not found");
    }

    const validatedNodes = AgentCanvasNodeSchema.array().parse(canvas.nodes);
    const validatedEdges = AgentCanvasEdgeSchema.array().parse(canvas.edges);

    return tx.agentCanvas.create({
      data: {
        name: options.name ?? `${canvas.name} (Copy)`,
        description: canvas.description,
        icon: canvas.icon,
        nodes: validatedNodes as Prisma.InputJsonValue,
        edges: validatedEdges as Prisma.InputJsonValue,
        viewport: canvas.viewport as Prisma.InputJsonValue,
        settings: canvas.settings as Prisma.InputJsonValue,
        triggerType: canvas.triggerType,
        triggerConfig: canvas.triggerConfig as Prisma.InputJsonValue,
        teamId,
        createdById: options.createdById,
      },
    });
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
    workflowId?: string;
    runId?: string;
    temporalStatus?: string;
    historyEventCount?: number;
    historySizeBytes?: number;
    continueAsNewCount?: number;
    sessionId?: string;
    turnId?: string;
  }
) {
  if (data.historyEventCount !== undefined && data.historyEventCount < 0) {
    throw new Error("historyEventCount must be non-negative");
  }
  if (data.historySizeBytes !== undefined && data.historySizeBytes < 0) {
    throw new Error("historySizeBytes must be non-negative");
  }
  if (data.continueAsNewCount !== undefined && data.continueAsNewCount < 0) {
    throw new Error("continueAsNewCount must be non-negative");
  }

  return db.agentCanvasExecution.create({
    data: {
      agentCanvasId: data.agentCanvasId,
      versionNumber: data.versionNumber,
      input: data.input as Prisma.InputJsonValue,
      trace: data.trace as Prisma.InputJsonValue,
      triggeredById: data.triggeredById,
      triggerSource: data.triggerSource,
      workflowId: data.workflowId,
      runId: data.runId,
      temporalStatus: data.temporalStatus,
      historyEventCount: data.historyEventCount,
      historySizeBytes: data.historySizeBytes,
      continueAsNewCount: data.continueAsNewCount,
      sessionId: data.sessionId,
      turnId: data.turnId,
    },
  });
}

export function updateAgentCanvasExecution(
  db: Database,
  id: string,
  teamId: string,
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
    workflowId?: string | null;
    runId?: string | null;
    temporalStatus?: string | null;
    historyEventCount?: number | null;
    historySizeBytes?: number | null;
    continueAsNewCount?: number | null;
  }
) {
  if (
    data.historyEventCount !== undefined &&
    data.historyEventCount !== null &&
    data.historyEventCount < 0
  ) {
    throw new Error("historyEventCount must be non-negative");
  }
  if (
    data.historySizeBytes !== undefined &&
    data.historySizeBytes !== null &&
    data.historySizeBytes < 0
  ) {
    throw new Error("historySizeBytes must be non-negative");
  }
  if (
    data.continueAsNewCount !== undefined &&
    data.continueAsNewCount !== null &&
    data.continueAsNewCount < 0
  ) {
    throw new Error("continueAsNewCount must be non-negative");
  }

  return db.$transaction(async (tx) => {
    const execution = await tx.agentCanvasExecution.findFirst({
      where: { id, agentCanvas: { teamId } },
      select: { id: true },
    });

    if (!execution) {
      throw new Error("Execution not found");
    }

    const updateData: Prisma.AgentCanvasExecutionUpdateInput = {};

    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.currentNodeId !== undefined) {
      updateData.currentNodeId = data.currentNodeId;
    }
    if (data.error !== undefined) {
      updateData.error = data.error;
    }
    if (data.latencyMs !== undefined) {
      updateData.latencyMs = data.latencyMs;
    }
    if (data.startedAt !== undefined) {
      updateData.startedAt = data.startedAt;
    }
    if (data.completedAt !== undefined) {
      updateData.completedAt = data.completedAt;
    }
    if (data.workflowId !== undefined) {
      updateData.workflowId = data.workflowId;
    }
    if (data.runId !== undefined) {
      updateData.runId = data.runId;
    }
    if (data.temporalStatus !== undefined) {
      updateData.temporalStatus = data.temporalStatus;
    }
    if (data.historyEventCount !== undefined) {
      updateData.historyEventCount = data.historyEventCount;
    }
    if (data.historySizeBytes !== undefined) {
      updateData.historySizeBytes = data.historySizeBytes;
    }
    if (data.continueAsNewCount !== undefined) {
      updateData.continueAsNewCount = data.continueAsNewCount;
    }

    if (data.output !== undefined) {
      updateData.output = data.output as Prisma.InputJsonValue;
    }

    if (data.trace !== undefined) {
      updateData.trace = data.trace as Prisma.InputJsonValue;
    }

    if (data.tokenUsage !== undefined) {
      updateData.tokenUsage = data.tokenUsage as Prisma.InputJsonValue;
    }

    return tx.agentCanvasExecution.update({
      where: { id: execution.id },
      data: updateData,
    });
  });
}

export function createAgentCanvasExecutionData(
  db: Database,
  teamId: string,
  data: {
    executionId: string;
    nodeId?: string;
    contentType?: string;
    payload: unknown;
    sizeBytes?: number;
  }
) {
  return db.$transaction(async (tx) => {
    const execution = await tx.agentCanvasExecution.findFirst({
      where: { id: data.executionId, agentCanvas: { teamId } },
      select: { id: true },
    });

    if (!execution) {
      throw new Error("Execution not found");
    }

    return tx.agentCanvasExecutionData.create({
      data: {
        executionId: data.executionId,
        nodeId: data.nodeId,
        contentType: data.contentType,
        payload: data.payload as Prisma.InputJsonValue,
        sizeBytes: data.sizeBytes,
      },
    });
  });
}

export function createAgentCanvasExecutionStep(
  db: Database,
  teamId: string,
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
  return db.$transaction(async (tx) => {
    const execution = await tx.agentCanvasExecution.findFirst({
      where: { id: data.executionId, agentCanvas: { teamId } },
      select: { id: true },
    });

    if (!execution) {
      throw new Error("Execution not found");
    }

    return tx.agentCanvasExecutionStep.create({
      data: {
        executionId: data.executionId,
        nodeId: data.nodeId,
        nodeType: data.nodeType,
        status: data.status,
        input: data.input as Prisma.InputJsonValue,
        output: data.output as Prisma.InputJsonValue,
        error: data.error,
        tokenUsage: data.tokenUsage as Prisma.InputJsonValue,
        latencyMs: data.latencyMs,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
      },
    });
  });
}

export function updateAgentCanvasExecutionStep(
  db: Database,
  id: string,
  teamId: string,
  data: {
    status?: AgentCanvasExecutionStatus;
    output?: unknown;
    error?: string;
    tokenUsage?: unknown;
    latencyMs?: number;
    completedAt?: Date;
  }
) {
  return db.$transaction(async (tx) => {
    const step = await tx.agentCanvasExecutionStep.findFirst({
      where: {
        id,
        execution: {
          agentCanvas: { teamId },
        },
      },
      select: { id: true },
    });

    if (!step) {
      throw new Error("Execution step not found");
    }

    const updateData: Prisma.AgentCanvasExecutionStepUpdateInput = {};

    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.error !== undefined) {
      updateData.error = data.error;
    }
    if (data.latencyMs !== undefined) {
      updateData.latencyMs = data.latencyMs;
    }
    if (data.completedAt !== undefined) {
      updateData.completedAt = data.completedAt;
    }

    if (data.output !== undefined) {
      updateData.output = data.output as Prisma.InputJsonValue;
    }

    if (data.tokenUsage !== undefined) {
      updateData.tokenUsage = data.tokenUsage as Prisma.InputJsonValue;
    }

    return tx.agentCanvasExecutionStep.update({
      where: { id: step.id },
      data: updateData,
    });
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
  teamId: string,
  data: {
    status: AgentCanvasApprovalStatus;
    responseMessage?: string;
    respondedById: string;
  }
) {
  return db.$transaction(async (tx) => {
    const approval = await tx.agentCanvasApproval.findFirst({
      where: {
        id,
        execution: {
          agentCanvas: { teamId },
        },
      },
      select: { id: true },
    });

    if (!approval) {
      throw new Error("Agent canvas approval not found");
    }

    return tx.agentCanvasApproval.update({
      where: { id: approval.id },
      data: {
        status: data.status,
        responseMessage: data.responseMessage,
        respondedById: data.respondedById,
        respondedAt: new Date(),
      },
    });
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
  const validatedNodes = AgentCanvasNodeSchema.array().parse(data.nodes);
  const validatedEdges = AgentCanvasEdgeSchema.array().parse(data.edges);

  return db.agentCanvasTemplate.create({
    data: {
      name: data.name,
      description: data.description,
      icon: data.icon,
      category: data.category,
      nodes: validatedNodes as Prisma.InputJsonValue,
      edges: validatedEdges as Prisma.InputJsonValue,
      settings: data.settings as Prisma.InputJsonValue,
      requiredConnectors: data.requiredConnectors ?? [],
      requiredTools: data.requiredTools ?? [],
      variables: data.variables as Prisma.InputJsonValue,
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

export function updateApprovalEscalation(
  db: Database,
  id: string,
  data: {
    reminderSentAt?: Date;
    escalatedAt?: Date;
    escalatedTo?: string;
  }
) {
  return db.agentCanvasApproval.update({
    where: { id },
    data,
  });
}

export function expireApproval(db: Database, id: string) {
  return db.agentCanvasApproval.update({
    where: { id },
    data: { status: "EXPIRED" as AgentCanvasApprovalStatus },
  });
}
