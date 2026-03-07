import {
  countAgentCanvases,
  createAgentCanvas,
  type Database,
  deleteAgentCanvas,
  findAgentCanvasById,
  listAgentCanvasExecutions,
  listAgentCanvases,
  listAgentCanvasVersions,
  publishAgentCanvas,
  updateAgentCanvas,
} from "@openbeam/db";
import { type CanvasState, CanvasStateSchema } from "@openbeam/types/canvas";
import type { ApiAccessAuthContext } from "./api-access";
import {
  createResolveTeamId,
  createResolveWriteUserId,
} from "./lib/service-errors";

export type CanvasServiceErrorCode =
  | "MISSING_TEAM"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "NO_TEAM_USER"
  | "BAD_REQUEST";

export class CanvasServiceError extends Error {
  readonly code: CanvasServiceErrorCode;

  constructor(code: CanvasServiceErrorCode, message: string) {
    super(message);
    this.name = "CanvasServiceError";
    this.code = code;
  }
}

const resolveTeamId = createResolveTeamId(CanvasServiceError);
const resolveWriteUserId = createResolveWriteUserId(CanvasServiceError);

async function resolveCanvas(
  db: Database,
  input: {
    teamId: string;
    canvasId: string;
  }
) {
  const canvas = await findAgentCanvasById(db, input.canvasId, input.teamId);
  if (!canvas) {
    throw new CanvasServiceError("NOT_FOUND", "Canvas not found");
  }
  return canvas;
}

export async function listCanvasForTeam(
  db: Database,
  input: {
    teamId: string | null;
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    limit: number;
    offset: number;
  }
) {
  const teamId = resolveTeamId(input.teamId);

  const [items, total] = await Promise.all([
    listAgentCanvases(db, teamId, {
      status: input.status,
      limit: input.limit + 1,
      offset: input.offset,
    }),
    countAgentCanvases(db, teamId, input.status),
  ]);

  const hasMore = items.length > input.limit;
  const canvases = hasMore ? items.slice(0, -1) : items;

  return {
    items: canvases,
    total,
    hasMore,
    nextOffset: hasMore ? input.offset + canvases.length : undefined,
  };
}

export async function createCanvasForTeam(
  db: Database,
  input: {
    teamId: string | null;
    authContext: ApiAccessAuthContext;
    name: string;
    description?: string;
    icon?: string;
    nodes: unknown[];
    edges: unknown[];
    viewport?: unknown;
    settings?: unknown;
    triggerType?: "MANUAL" | "SCHEDULE" | "WEBHOOK" | "EVENT";
    triggerConfig?: unknown;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const userId = await resolveWriteUserId(db, {
    teamId,
    authContext: input.authContext,
    message: "No team user is available for canvas ownership",
  });

  return createAgentCanvas(db, {
    name: input.name,
    description: input.description,
    icon: input.icon,
    nodes: input.nodes,
    edges: input.edges,
    viewport: input.viewport,
    settings: input.settings,
    triggerType: input.triggerType,
    triggerConfig: input.triggerConfig,
    teamId,
    createdById: userId,
  });
}

export async function getCanvasForTeam(
  db: Database,
  input: {
    teamId: string | null;
    canvasId: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  return await resolveCanvas(db, {
    teamId,
    canvasId: input.canvasId,
  });
}

export async function updateCanvasForTeam(
  db: Database,
  input: {
    teamId: string | null;
    canvasId: string;
    name?: string;
    description?: string;
    icon?: string;
    nodes?: unknown[];
    edges?: unknown[];
    viewport?: unknown;
    settings?: unknown;
    triggerType?: "MANUAL" | "SCHEDULE" | "WEBHOOK" | "EVENT";
    triggerConfig?: unknown;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  await resolveCanvas(db, {
    teamId,
    canvasId: input.canvasId,
  });

  return updateAgentCanvas(db, input.canvasId, teamId, {
    name: input.name,
    description: input.description,
    icon: input.icon,
    nodes: input.nodes,
    edges: input.edges,
    viewport: input.viewport,
    settings: input.settings,
    triggerType: input.triggerType,
    triggerConfig: input.triggerConfig,
  });
}

export async function deleteCanvasForTeam(
  db: Database,
  input: {
    teamId: string | null;
    canvasId: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const result = await deleteAgentCanvas(db, input.canvasId, teamId);

  if (result.count === 0) {
    throw new CanvasServiceError("NOT_FOUND", "Canvas not found");
  }
}

export async function publishCanvasForTeam(
  db: Database,
  input: {
    teamId: string | null;
    canvasId: string;
    authContext: ApiAccessAuthContext;
    changelog?: string;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  const userId = await resolveWriteUserId(db, {
    teamId,
    authContext: input.authContext,
    message: "No team user is available for canvas publishing",
  });

  await resolveCanvas(db, { teamId, canvasId: input.canvasId });

  try {
    return await publishAgentCanvas(db, input.canvasId, teamId, {
      publishedById: userId,
      changelog: input.changelog,
    });
  } catch (error) {
    if (error instanceof CanvasServiceError) {
      throw error;
    }
    throw new CanvasServiceError(
      "BAD_REQUEST",
      error instanceof Error ? error.message : "Failed to publish canvas"
    );
  }
}

export async function listCanvasExecutionsForTeam(
  db: Database,
  input: {
    teamId: string | null;
    canvasId: string;
    status?:
      | "PENDING"
      | "RUNNING"
      | "WAITING_APPROVAL"
      | "WAITING_INPUT"
      | "COMPLETED"
      | "FAILED"
      | "CANCELLED"
      | "TIMED_OUT";
    limit: number;
    offset: number;
  }
) {
  const teamId = resolveTeamId(input.teamId);
  await resolveCanvas(db, {
    teamId,
    canvasId: input.canvasId,
  });

  const items = await listAgentCanvasExecutions(db, input.canvasId, {
    status: input.status,
    limit: input.limit + 1,
    offset: input.offset,
  });

  const hasMore = items.length > input.limit;
  const executions = hasMore ? items.slice(0, -1) : items;

  return {
    items: executions,
    hasMore,
    nextOffset: hasMore ? input.offset + executions.length : undefined,
  };
}

export async function getCanvasExecutionContextForTeam(
  db: Database,
  input: {
    teamId: string | null;
    canvasId: string;
    authContext: ApiAccessAuthContext;
  }
): Promise<{
  canvasId: string;
  teamId: string;
  versionNumber: number;
  nodes: CanvasState["nodes"];
  edges: CanvasState["edges"];
  viewport: CanvasState["viewport"];
  triggeredById: string;
}> {
  const teamId = resolveTeamId(input.teamId);
  const userId = await resolveWriteUserId(db, {
    teamId,
    authContext: input.authContext,
    message: "No team user is available for canvas execution",
  });

  const canvas = await resolveCanvas(db, {
    teamId,
    canvasId: input.canvasId,
  });

  if (canvas.status !== "PUBLISHED") {
    throw new CanvasServiceError(
      "INVALID_STATE",
      "Can only execute published canvases"
    );
  }

  const [latestVersion] = await listAgentCanvasVersions(db, input.canvasId, {
    limit: 1,
  });

  if (!latestVersion) {
    throw new CanvasServiceError("NOT_FOUND", "Published version not found");
  }

  const canvasState = CanvasStateSchema.safeParse({
    nodes: latestVersion.nodes,
    edges: latestVersion.edges,
    viewport: latestVersion.viewport ?? undefined,
  });

  if (!canvasState.success) {
    throw new CanvasServiceError(
      "INVALID_STATE",
      "Canvas version contains invalid data"
    );
  }

  return {
    canvasId: input.canvasId,
    teamId,
    versionNumber: latestVersion.version,
    nodes: canvasState.data.nodes,
    edges: canvasState.data.edges,
    viewport: canvasState.data.viewport,
    triggeredById: userId,
  };
}
