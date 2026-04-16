import type { RouteHandler } from "@hono/zod-openapi";
import { CATALOG_AGENTS, type CatalogAgent } from "@openbeam/computer";
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
  rejectComputerRun,
} from "@openbeam/db";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type {
  approveRunRoute,
  deleteAgentRoute,
  enableAgentRoute,
  getCatalogRoute,
  listAgentsRoute,
  listMemoryRoute,
  listRunsRoute,
  rejectRunRoute,
  triggerRunRoute,
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
    return c.json({ error: "Template not found" }, 404);
  }

  const existing = await getComputerAgentBySlug(prisma, teamId, template.slug);
  if (existing) {
    return c.json({ error: "Agent already enabled" }, 409);
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
    return c.json({ error: "Agent not found" }, 404);
  }
  if (agent.status !== "ACTIVE") {
    return c.json({ error: "Agent is not active" }, 400);
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
  const body = c.req.valid("json");

  const approved = await approveComputerRun(
    prisma,
    runId,
    body.approvedIndices
  );
  if (!approved) {
    return c.json({ error: "No pending proposals" }, 404);
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

  await rejectComputerRun(prisma, runId);
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
