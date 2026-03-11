import { createHash, randomBytes } from "node:crypto";
import {
  countControlAgents,
  createControlAgent,
  createControlAgentApiKey,
  createControlAgentConfigRevision,
  type Database,
  deleteControlAgent,
  findControlAgentById,
  findControlAgentOrgChart,
  findControlAgentWithRelations,
  listControlAgentApiKeys,
  listControlAgentConfigRevisions,
  listControlAgents,
  revokeControlAgentApiKey,
  touchControlAgentApiKey,
  updateControlAgent,
  updateControlAgentStatus,
} from "@openbeam/db";
import type { CreateControlAgentInput } from "@openbeam/types/control/validators/agents";
import { ControlServiceError } from "./errors";

const MAX_CHAIN_DEPTH = 50;
const API_KEY_PREFIX = "opc_";
const API_KEY_BYTES = 24;

const TERMINAL_STATUSES = new Set(["TERMINATED"]);
const BLOCKED_STATUSES = new Set(["TERMINATED", "PENDING_APPROVAL"]);

function generateToken(): string {
  return `${API_KEY_PREFIX}${randomBytes(API_KEY_BYTES).toString("hex")}`;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function diffConfigKeys(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): string[] {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];
  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed.push(key);
    }
  }
  return changed;
}

function buildConfigSnapshot(
  agent: Record<string, unknown>
): Record<string, unknown> {
  return {
    name: agent.name,
    role: agent.role,
    title: agent.title,
    icon: agent.icon,
    capabilities: agent.capabilities,
    adapterType: agent.adapterType,
    adapterConfig: agent.adapterConfig,
    runtimeConfig: agent.runtimeConfig,
    budgetMonthlyCents: agent.budgetMonthlyCents,
    reportsTo: agent.reportsTo,
    permissions: agent.permissions,
  };
}

export async function createControlAgentForTeam(
  db: Database,
  teamId: string,
  input: CreateControlAgentInput
) {
  if (input.reportsTo) {
    const manager = await findControlAgentById(db, input.reportsTo, teamId);
    if (!manager) {
      throw ControlServiceError.notFound("Manager agent");
    }
  }

  return createControlAgent(db, {
    teamId,
    name: input.name,
    role: input.role,
    title: input.title ?? undefined,
    icon: input.icon ?? undefined,
    reportsTo: input.reportsTo ?? undefined,
    capabilities: input.capabilities ?? undefined,
    adapterType: input.adapterType,
    adapterConfig: input.adapterConfig,
    runtimeConfig: input.runtimeConfig,
    budgetMonthlyCents: input.budgetMonthlyCents,
    permissions: input.permissions,
    metadata: input.metadata,
  });
}

export async function getControlAgentForTeam(
  db: Database,
  teamId: string,
  agentId: string
) {
  const agent = await findControlAgentById(db, agentId, teamId);
  if (!agent) {
    throw ControlServiceError.notFound("Agent");
  }
  return agent;
}

export async function getControlAgentWithRelationsForTeam(
  db: Database,
  teamId: string,
  agentId: string
) {
  const agent = await findControlAgentWithRelations(db, agentId, teamId);
  if (!agent) {
    throw ControlServiceError.notFound("Agent");
  }
  return agent;
}

export async function listControlAgentsForTeam(
  db: Database,
  teamId: string,
  options?: { status?: string | string[]; limit?: number; offset?: number }
) {
  return await listControlAgents(db, teamId, {
    status: options?.status as never,
    limit: options?.limit,
    offset: options?.offset,
  });
}

export async function countControlAgentsForTeam(
  db: Database,
  teamId: string,
  status?: string | string[]
) {
  return await countControlAgents(db, teamId, status as never);
}

interface UpdateAgentOptions {
  recordRevision?: boolean;
  actorUserId?: string;
  actorAgentId?: string;
}

export async function updateControlAgentForTeam(
  db: Database,
  params: {
    teamId: string;
    agentId: string;
    data: Record<string, unknown>;
    options?: UpdateAgentOptions;
  }
) {
  const { teamId, agentId, data, options } = params;
  const agent = await getControlAgentForTeam(db, teamId, agentId);

  if (TERMINAL_STATUSES.has(agent.status)) {
    throw ControlServiceError.invalidState("Cannot update terminated agent");
  }

  if (data.reportsTo && typeof data.reportsTo === "string") {
    await validateNoReportsCycle(db, teamId, agentId, data.reportsTo);
  }

  const beforeConfig = buildConfigSnapshot(
    agent as unknown as Record<string, unknown>
  );

  await updateControlAgent(db, agentId, teamId, data as never);

  if (options?.recordRevision) {
    const updated = await findControlAgentById(db, agentId, teamId);
    if (updated) {
      const afterConfig = buildConfigSnapshot(
        updated as unknown as Record<string, unknown>
      );
      const changedKeys = diffConfigKeys(beforeConfig, afterConfig);
      if (changedKeys.length > 0) {
        await createControlAgentConfigRevision(db, {
          teamId,
          agentId,
          source: "patch",
          changedKeys,
          beforeConfig,
          afterConfig,
          createdByUserId: options.actorUserId,
          createdByAgentId: options.actorAgentId,
        });
      }
    }
  }
}

async function validateNoReportsCycle(
  db: Database,
  teamId: string,
  agentId: string,
  managerId: string
) {
  let currentId: string | null = managerId;
  let depth = 0;

  while (currentId && depth < MAX_CHAIN_DEPTH) {
    if (currentId === agentId) {
      throw ControlServiceError.unprocessable(
        "Reporting relationship would create a cycle"
      );
    }
    const manager = await findControlAgentById(db, currentId, teamId);
    currentId = manager?.reportsTo ?? null;
    depth += 1;
  }
}

export async function pauseControlAgentForTeam(
  db: Database,
  teamId: string,
  agentId: string
) {
  const agent = await getControlAgentForTeam(db, teamId, agentId);
  if (TERMINAL_STATUSES.has(agent.status)) {
    throw ControlServiceError.invalidState("Cannot pause terminated agent");
  }
  await updateControlAgentStatus(db, agentId, teamId, "PAUSED");
}

export async function resumeControlAgentForTeam(
  db: Database,
  teamId: string,
  agentId: string
) {
  const agent = await getControlAgentForTeam(db, teamId, agentId);
  if (BLOCKED_STATUSES.has(agent.status)) {
    throw ControlServiceError.invalidState(
      `Cannot resume agent in ${agent.status} status`
    );
  }
  await updateControlAgentStatus(db, agentId, teamId, "IDLE");
}

export async function terminateControlAgentForTeam(
  db: Database,
  teamId: string,
  agentId: string
) {
  await getControlAgentForTeam(db, teamId, agentId);
  await updateControlAgentStatus(db, agentId, teamId, "TERMINATED");

  const keys = await listControlAgentApiKeys(db, teamId, agentId);
  for (const key of keys) {
    if (!key.revokedAt) {
      await revokeControlAgentApiKey(db, key.id, teamId);
    }
  }
}

export async function removeControlAgentForTeam(
  db: Database,
  teamId: string,
  agentId: string
) {
  await getControlAgentForTeam(db, teamId, agentId);
  await deleteControlAgent(db, agentId, teamId);
}

export async function activateControlAgentForTeam(
  db: Database,
  teamId: string,
  agentId: string
) {
  const agent = await getControlAgentForTeam(db, teamId, agentId);
  if (agent.status !== "PENDING_APPROVAL") {
    throw ControlServiceError.invalidState(
      "Agent is not in PENDING_APPROVAL status"
    );
  }
  await updateControlAgentStatus(db, agentId, teamId, "IDLE");
}

export async function createControlAgentApiKeyForTeam(
  db: Database,
  params: { teamId: string; agentId: string; name: string }
) {
  const agent = await getControlAgentForTeam(db, params.teamId, params.agentId);
  if (BLOCKED_STATUSES.has(agent.status)) {
    throw ControlServiceError.invalidState(
      `Cannot create API key for agent in ${agent.status} status`
    );
  }

  const token = generateToken();
  const keyHash = hashToken(token);

  const key = await createControlAgentApiKey(db, {
    teamId: params.teamId,
    agentId: params.agentId,
    name: params.name,
    keyHash,
  });

  return { id: key.id, name: key.name, token, createdAt: key.createdAt };
}

export async function listControlAgentApiKeysForTeam(
  db: Database,
  teamId: string,
  agentId: string
) {
  return await listControlAgentApiKeys(db, teamId, agentId);
}

export async function revokeControlAgentApiKeyForTeam(
  db: Database,
  keyId: string,
  teamId: string
) {
  return await revokeControlAgentApiKey(db, keyId, teamId);
}

export async function revokeAllControlAgentApiKeysForTeam(
  db: Database,
  teamId: string,
  agentId: string
) {
  const keys = await listControlAgentApiKeys(db, teamId, agentId);
  for (const key of keys) {
    if (!key.revokedAt) {
      await revokeControlAgentApiKey(db, key.id, teamId);
    }
  }
  return { revoked: keys.filter((k) => !k.revokedAt).length };
}

export async function verifyControlAgentApiKey(db: Database, token: string) {
  const { findControlAgentApiKeyByHash } = await import("@openbeam/db");
  const keyHash = hashToken(token);
  const key = await findControlAgentApiKeyByHash(db, keyHash);
  if (!key) {
    return null;
  }
  await touchControlAgentApiKey(db, key.id);
  return key;
}

export async function listControlAgentConfigRevisionsForTeam(
  db: Database,
  teamId: string,
  agentId: string
) {
  return await listControlAgentConfigRevisions(db, teamId, agentId);
}

export async function rollbackControlAgentConfigForTeam(
  db: Database,
  params: {
    teamId: string;
    agentId: string;
    revisionId: string;
    actorUserId?: string;
    actorAgentId?: string;
  }
) {
  const revisions = await listControlAgentConfigRevisions(
    db,
    params.teamId,
    params.agentId
  );
  const revision = revisions.find((r) => r.id === params.revisionId);
  if (!revision) {
    throw ControlServiceError.notFound("Config revision");
  }

  const afterConfig = revision.afterConfig as Record<string, unknown>;
  await updateControlAgent(
    db,
    params.agentId,
    params.teamId,
    afterConfig as never
  );

  const agent = await findControlAgentById(db, params.agentId, params.teamId);
  if (agent) {
    const currentConfig = buildConfigSnapshot(
      agent as unknown as Record<string, unknown>
    );
    const changedKeys = diffConfigKeys(currentConfig, afterConfig);
    if (changedKeys.length > 0) {
      await createControlAgentConfigRevision(db, {
        teamId: params.teamId,
        agentId: params.agentId,
        source: "rollback",
        rolledBackFromRevisionId: params.revisionId,
        changedKeys,
        beforeConfig: currentConfig,
        afterConfig,
        createdByUserId: params.actorUserId,
        createdByAgentId: params.actorAgentId,
      });
    }
  }
}

export async function getControlAgentChainOfCommand(
  db: Database,
  teamId: string,
  agentId: string
) {
  const chain: Array<{
    id: string;
    name: string;
    role: string;
    title: string | null;
  }> = [];

  let currentId: string | null = agentId;
  let depth = 0;

  while (currentId && depth < MAX_CHAIN_DEPTH) {
    const agent = await findControlAgentById(db, currentId, teamId);
    if (!agent) {
      break;
    }

    if (depth > 0) {
      chain.push({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        title: agent.title,
      });
    }

    currentId = agent.reportsTo;
    depth += 1;
  }

  return chain;
}

export interface OrgNode {
  id: string;
  name: string;
  role: string;
  title: string | null;
  icon: string | null;
  status: string;
  children: OrgNode[];
}

export async function getControlAgentOrgChartForTeam(
  db: Database,
  teamId: string
): Promise<OrgNode[]> {
  const agents = await findControlAgentOrgChart(db, teamId);
  const childrenMap = new Map<string | null, typeof agents>();

  for (const agent of agents) {
    const parentKey = agent.reportsTo ?? null;
    const siblings = childrenMap.get(parentKey) ?? [];
    siblings.push(agent);
    childrenMap.set(parentKey, siblings);
  }

  function buildTree(parentId: string | null): OrgNode[] {
    const children = childrenMap.get(parentId) ?? [];
    return children.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      title: a.title,
      icon: a.icon,
      status: a.status,
      children: buildTree(a.id),
    }));
  }

  return buildTree(null);
}
