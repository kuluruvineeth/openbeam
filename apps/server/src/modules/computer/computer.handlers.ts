import type { RouteHandler } from "@hono/zod-openapi";
import {
  CATALOG_AGENTS,
  type CatalogAgent,
  connectMcpPair,
  generateAgentFromDescription,
} from "@openbeam/computer";
import prisma, {
  approveComputerRun,
  createComputerAgent,
  createComputerRun,
  deleteComputerAgent,
  getAgentMemoryEntries,
  getComputerAgentBySlug,
  getComputerAgentForRun,
  getComputerAgents,
  getComputerRunProposals,
  getComputerRuns,
  getComputerRunWithSteps,
  rejectComputerRun,
  updateComputerAgent,
} from "@openbeam/db";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type {
  approveRunRoute,
  confirmAgentRoute,
  deleteAgentRoute,
  enableAgentRoute,
  generateAgentRoute,
  getCatalogRoute,
  getProposalsRoute,
  getRunDetailRoute,
  listAgentsRoute,
  listMemoryRoute,
  listRunsRoute,
  rejectRunRoute,
  triggerRunRoute,
  updateAgentRoute,
} from "./computer.routes";

function requireTeamId(c: Parameters<typeof getTeamId>[0]): string {
  const teamId = getTeamId(c);
  if (!teamId) {
    throw new Error("Team ID required");
  }
  return teamId;
}

export const getCatalogHandler: RouteHandler<
  typeof getCatalogRoute,
  AuthEnv
> = (c) => {
  const catalog = CATALOG_AGENTS.map(
    ({ templateId, name, slug, description, scheduleCron }: CatalogAgent) => ({
      templateId,
      name,
      slug,
      description,
      scheduleCron,
    })
  );
  return c.json({ data: catalog }, 200);
};

export const listAgentsHandler: RouteHandler<
  typeof listAgentsRoute,
  AuthEnv
> = async (c) => {
  const agents = await getComputerAgents(prisma, requireTeamId(c));
  return c.json({ data: agents }, 200);
};

export const enableAgentHandler: RouteHandler<
  typeof enableAgentRoute,
  AuthEnv
> = async (c) => {
  const { templateId } = c.req.valid("json");
  const teamId = requireTeamId(c);

  const template = CATALOG_AGENTS.find(
    (a: CatalogAgent) => a.templateId === templateId
  );
  if (!template) {
    return c.json({ error: `Template not found (id: ${templateId})` }, 404);
  }

  const existing = await getComputerAgentBySlug(prisma, teamId, template.slug);
  if (existing) {
    return c.json({ error: `Agent already enabled (id: ${existing.id})` }, 409);
  }

  const authCtx = c.get("authContext");
  const userId = authCtx.type === "session" ? authCtx.userId : undefined;

  const agent = await createComputerAgent(prisma, {
    teamId,
    name: template.name,
    slug: template.slug,
    description: template.description,
    source: "CATALOG",
    code: template.code,
    templateId: template.templateId,
    scheduleCron: template.scheduleCron,
    status: "ACTIVE",
    createdBy: userId,
  });

  return c.json({ data: agent }, 201);
};

export const deleteAgentHandler: RouteHandler<
  typeof deleteAgentRoute,
  AuthEnv
> = async (c) => {
  const { agentId } = c.req.valid("param");
  const teamId = requireTeamId(c);

  try {
    await deleteComputerAgent(prisma, agentId, teamId);
    return c.json({ data: { runId: agentId, status: "deleted" } }, 200);
  } catch {
    return c.json({ error: "Agent not found" }, 404);
  }
};

export const triggerRunHandler: RouteHandler<
  typeof triggerRunRoute,
  AuthEnv
> = async (c) => {
  const { agentId } = c.req.valid("param");
  const teamId = requireTeamId(c);

  const agent = await getComputerAgentForRun(prisma, agentId, teamId);
  if (!agent) {
    return c.json({ error: `Agent not found (id: ${agentId})` }, 404);
  }
  if (agent.status !== "ACTIVE") {
    return c.json(
      {
        error: `Agent is not active (id: ${agentId}, status: ${agent.status})`,
      },
      400
    );
  }

  const authCtx = c.get("authContext");
  const userId = authCtx.type === "session" ? authCtx.userId : undefined;

  const runId = crypto.randomUUID();
  await createComputerRun(prisma, {
    id: runId,
    agentId,
    teamId,
    triggeredBy: "MANUAL",
    triggeredByUser: userId,
  });

  return c.json({ data: { runId } }, 202);
};

export const listRunsHandler: RouteHandler<
  typeof listRunsRoute,
  AuthEnv
> = async (c) => {
  const { agentId } = c.req.valid("param");
  const teamId = requireTeamId(c);
  const runs = await getComputerRuns(prisma, agentId, teamId);
  return c.json({ data: runs }, 200);
};

export const approveRunHandler: RouteHandler<
  typeof approveRunRoute,
  AuthEnv
> = async (c) => {
  const { runId } = c.req.valid("param");
  const teamId = requireTeamId(c);
  const body = c.req.valid("json");

  const approved = await approveComputerRun(
    prisma,
    runId,
    teamId,
    body.approvedIndices
  );
  if (!approved) {
    return c.json({ error: `No pending proposals (runId: ${runId})` }, 404);
  }

  const actions = (approved.proposedActions ?? []) as unknown[];
  return c.json(
    { data: { runId, status: "approved", actionsQueued: actions.length } },
    200
  );
};

export const rejectRunHandler: RouteHandler<
  typeof rejectRunRoute,
  AuthEnv
> = async (c) => {
  const { agentId, runId } = c.req.valid("param");
  const teamId = requireTeamId(c);

  const proposals = await getComputerRunProposals(
    prisma,
    runId,
    agentId,
    teamId
  );
  if (!proposals) {
    return c.json({ error: "No pending proposals" }, 404);
  }

  const rejected = await rejectComputerRun(prisma, runId, teamId);
  if (!rejected) {
    return c.json({ error: `No pending proposals (runId: ${runId})` }, 404);
  }
  return c.json({ data: { runId, status: "rejected" } }, 200);
};

export const listMemoryHandler: RouteHandler<
  typeof listMemoryRoute,
  AuthEnv
> = async (c) => {
  const { agentId } = c.req.valid("param");
  const teamId = requireTeamId(c);
  const memory = await getAgentMemoryEntries(prisma, agentId, teamId);
  return c.json({ data: memory }, 200);
};

export const generateAgentHandler: RouteHandler<
  typeof generateAgentRoute,
  AuthEnv
> = async (c) => {
  const { description } = c.req.valid("json");

  try {
    const { createOpenBeamMcpServer } = await import(
      "@/modules/mcp/mcp.factory"
    );
    const authCtx = c.get("authContext");
    const mcpCtx = {
      teamId: requireTeamId(c),
      userId: authCtx.type === "session" ? authCtx.userId : "",
      userEmail: null,
      scopes: ["admin:*"],
      timezone: null,
      locale: null,
    };
    const mcpServer = createOpenBeamMcpServer(mcpCtx);
    const mcp = await connectMcpPair(mcpServer);

    try {
      const result = await generateAgentFromDescription(
        description,
        mcp.client
      );
      return c.json({ data: result }, 200);
    } finally {
      await mcp.close();
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Generation failed";
    return c.json({ error: msg }, 400);
  }
};

export const confirmAgentHandler: RouteHandler<
  typeof confirmAgentRoute,
  AuthEnv
> = async (c) => {
  const input = c.req.valid("json");
  const teamId = requireTeamId(c);

  const existing = await getComputerAgentBySlug(prisma, teamId, input.slug);
  if (existing) {
    return c.json(
      {
        error: `Agent with slug "${input.slug}" already exists (id: ${existing.id})`,
      },
      409
    );
  }

  const authCtx = c.get("authContext");
  const userId = authCtx.type === "session" ? authCtx.userId : undefined;

  const agent = await createComputerAgent(prisma, {
    teamId,
    name: input.name,
    slug: input.slug,
    description: input.description,
    source: "GENERATED",
    code: input.code,
    scheduleCron: input.scheduleCron,
    status: "ACTIVE",
    createdBy: userId,
  });

  return c.json({ data: agent }, 201);
};

export const updateAgentHandler: RouteHandler<
  typeof updateAgentRoute,
  AuthEnv
> = async (c) => {
  const { agentId } = c.req.valid("param");
  const teamId = requireTeamId(c);
  const body = c.req.valid("json");

  try {
    const updated = await updateComputerAgent(prisma, agentId, teamId, body);
    return c.json({ data: updated }, 200);
  } catch {
    return c.json({ error: "Agent not found" }, 404);
  }
};

export const getRunDetailHandler: RouteHandler<
  typeof getRunDetailRoute,
  AuthEnv
> = async (c) => {
  const { agentId, runId } = c.req.valid("param");
  const teamId = requireTeamId(c);

  const run = await getComputerRunWithSteps(prisma, runId, agentId, teamId);
  if (!run) {
    return c.json({ error: "Run not found" }, 404);
  }
  return c.json({ data: run }, 200);
};

export const getProposalsHandler: RouteHandler<
  typeof getProposalsRoute,
  AuthEnv
> = async (c) => {
  const { agentId, runId } = c.req.valid("param");
  const teamId = requireTeamId(c);

  const proposals = await getComputerRunProposals(
    prisma,
    runId,
    agentId,
    teamId
  );
  return c.json({ data: proposals }, 200);
};
