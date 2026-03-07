import { beforeEach, describe, expect, it, mock } from "bun:test";

const TEAM_ID = "team_01";
const AGENT_ID = "agent_01";
const MANAGER_ID = "agent_mgr";
const OPC_PREFIX = /^opc_/;

function makeAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: AGENT_ID,
    teamId: TEAM_ID,
    name: "test-agent",
    role: "general" as const,
    title: "Test Worker",
    icon: null as string | null,
    status: "IDLE",
    reportsTo: null as string | null,
    capabilities: [] as string[],
    adapterType: "HTTP",
    adapterConfig: {},
    runtimeConfig: {},
    budgetMonthlyCents: 1000,
    permissions: [] as string[],
    metadata: {},
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeApiKey(overrides: Record<string, unknown> = {}) {
  return {
    id: "key_01",
    teamId: TEAM_ID,
    agentId: AGENT_ID,
    name: "default",
    keyHash: "abc123",
    revokedAt: null,
    lastUsedAt: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

type AnyFn = (...args: any[]) => any;
const mockFindById = mock((() => Promise.resolve(makeAgent())) as AnyFn);
const mockFindWithRelations = mock((() =>
  Promise.resolve(makeAgent())) as AnyFn);
const mockCreate = mock((() => Promise.resolve(makeAgent())) as AnyFn);
const mockUpdate = mock((() => Promise.resolve(makeAgent())) as AnyFn);
const mockUpdateStatus = mock((() => Promise.resolve(makeAgent())) as AnyFn);
const mockDelete = mock((() => Promise.resolve(makeAgent())) as AnyFn);
const mockList = mock((() => Promise.resolve([makeAgent()])) as AnyFn);
const mockCount = mock((() => Promise.resolve(1)) as AnyFn);
const mockFindOrgChart = mock((() => Promise.resolve([makeAgent()])) as AnyFn);
const mockCreateApiKey = mock((() => Promise.resolve(makeApiKey())) as AnyFn);
const mockListApiKeys = mock((() => Promise.resolve([makeApiKey()])) as AnyFn);
const mockRevokeApiKey = mock((() => Promise.resolve(makeApiKey())) as AnyFn);
const mockTouchApiKey = mock((() => Promise.resolve(undefined)) as AnyFn);
const mockFindApiKeyByHash = mock((() =>
  Promise.resolve(makeApiKey())) as AnyFn);
const mockCreateConfigRevision = mock(() => Promise.resolve({ id: "rev_01" }));
const mockListConfigRevisions = mock(() =>
  Promise.resolve([
    {
      id: "rev_01",
      teamId: TEAM_ID,
      agentId: AGENT_ID,
      source: "patch",
      changedKeys: ["name"],
      beforeConfig: { name: "old" },
      afterConfig: { name: "new" },
    },
  ])
);

mock.module("@openbeam/db", () => ({
  findControlAgentById: mockFindById,
  findControlAgentWithRelations: mockFindWithRelations,
  createControlAgent: mockCreate,
  updateControlAgent: mockUpdate,
  updateControlAgentStatus: mockUpdateStatus,
  deleteControlAgent: mockDelete,
  listControlAgents: mockList,
  countControlAgents: mockCount,
  findControlAgentOrgChart: mockFindOrgChart,
  createControlAgentApiKey: mockCreateApiKey,
  listControlAgentApiKeys: mockListApiKeys,
  revokeControlAgentApiKey: mockRevokeApiKey,
  touchControlAgentApiKey: mockTouchApiKey,
  findControlAgentApiKeyByHash: mockFindApiKeyByHash,
  createControlAgentConfigRevision: mockCreateConfigRevision,
  listControlAgentConfigRevisions: mockListConfigRevisions,
}));

const {
  createControlAgentForTeam,
  getControlAgentForTeam,
  getControlAgentWithRelationsForTeam,
  listControlAgentsForTeam,
  countControlAgentsForTeam,
  updateControlAgentForTeam,
  pauseControlAgentForTeam,
  resumeControlAgentForTeam,
  terminateControlAgentForTeam,
  removeControlAgentForTeam,
  activateControlAgentForTeam,
  createControlAgentApiKeyForTeam,
  listControlAgentApiKeysForTeam,
  revokeControlAgentApiKeyForTeam,
  revokeAllControlAgentApiKeysForTeam,
  verifyControlAgentApiKey,
  listControlAgentConfigRevisionsForTeam,
  rollbackControlAgentConfigForTeam,
  getControlAgentChainOfCommand,
  getControlAgentOrgChartForTeam,
} = await import("../agents");

const { ControlServiceError } = await import("../errors");

const db = {} as never;

beforeEach(() => {
  mockFindById.mockReset();
  mockFindById.mockImplementation(() => Promise.resolve(makeAgent()));
  mockFindWithRelations.mockReset();
  mockFindWithRelations.mockImplementation(() => Promise.resolve(makeAgent()));
  mockCreate.mockReset();
  mockCreate.mockImplementation(() => Promise.resolve(makeAgent()));
  mockUpdate.mockReset();
  mockUpdate.mockImplementation(() => Promise.resolve(makeAgent()));
  mockUpdateStatus.mockReset();
  mockUpdateStatus.mockImplementation(() => Promise.resolve(makeAgent()));
  mockDelete.mockReset();
  mockDelete.mockImplementation(() => Promise.resolve(makeAgent()));
  mockList.mockReset();
  mockList.mockImplementation(() => Promise.resolve([makeAgent()]));
  mockCount.mockReset();
  mockCount.mockImplementation(() => Promise.resolve(1));
  mockFindOrgChart.mockReset();
  mockFindOrgChart.mockImplementation(() => Promise.resolve([makeAgent()]));
  mockCreateApiKey.mockReset();
  mockCreateApiKey.mockImplementation(() => Promise.resolve(makeApiKey()));
  mockListApiKeys.mockReset();
  mockListApiKeys.mockImplementation(() => Promise.resolve([makeApiKey()]));
  mockRevokeApiKey.mockReset();
  mockRevokeApiKey.mockImplementation(() => Promise.resolve(makeApiKey()));
  mockTouchApiKey.mockReset();
  mockTouchApiKey.mockImplementation(() => Promise.resolve(undefined));
  mockFindApiKeyByHash.mockReset();
  mockFindApiKeyByHash.mockImplementation(() => Promise.resolve(makeApiKey()));
  mockCreateConfigRevision.mockReset();
  mockCreateConfigRevision.mockImplementation(() =>
    Promise.resolve({ id: "rev_01" })
  );
  mockListConfigRevisions.mockReset();
  mockListConfigRevisions.mockImplementation(() =>
    Promise.resolve([
      {
        id: "rev_01",
        teamId: TEAM_ID,
        agentId: AGENT_ID,
        source: "patch",
        changedKeys: ["name"],
        beforeConfig: { name: "old" },
        afterConfig: { name: "new" },
      },
    ])
  );
});

describe("createControlAgentForTeam", () => {
  const input: import("@openbeam/types/control/validators/agents").CreateControlAgentInput =
    {
      name: "worker-1",
      role: "general",
      adapterType: "HTTP",
      adapterConfig: {},
      runtimeConfig: {},
      budgetMonthlyCents: 500,
    };

  it("creates agent without reportsTo", async () => {
    await createControlAgentForTeam(db, TEAM_ID, input);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const arg = (mockCreate.mock.calls[0] as unknown[])[1] as Record<
      string,
      unknown
    >;
    expect(arg.teamId).toBe(TEAM_ID);
    expect(arg.name).toBe("worker-1");
  });

  it("validates reportsTo manager exists", async () => {
    mockFindById.mockImplementation(() => Promise.resolve(null));
    await expect(
      createControlAgentForTeam(db, TEAM_ID, {
        ...input,
        reportsTo: "nonexistent",
      })
    ).rejects.toThrow("Manager agent not found");
  });

  it("creates agent when reportsTo manager exists", async () => {
    mockFindById.mockImplementation(() =>
      Promise.resolve(makeAgent({ id: MANAGER_ID }))
    );
    await createControlAgentForTeam(db, TEAM_ID, {
      ...input,
      reportsTo: MANAGER_ID,
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

describe("getControlAgentForTeam", () => {
  it("returns agent when found", async () => {
    const result = await getControlAgentForTeam(db, TEAM_ID, AGENT_ID);
    expect(result.id).toBe(AGENT_ID);
    expect(mockFindById).toHaveBeenCalledWith(db, AGENT_ID, TEAM_ID);
  });

  it("throws NOT_FOUND when agent missing", async () => {
    mockFindById.mockImplementation(() => Promise.resolve(null));
    try {
      await getControlAgentForTeam(db, TEAM_ID, "missing");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ControlServiceError);
      expect((err as InstanceType<typeof ControlServiceError>).code).toBe(
        "NOT_FOUND"
      );
    }
  });
});

describe("getControlAgentWithRelationsForTeam", () => {
  it("returns agent with relations", async () => {
    const result = await getControlAgentWithRelationsForTeam(
      db,
      TEAM_ID,
      AGENT_ID
    );
    expect(result.id).toBe(AGENT_ID);
  });

  it("throws NOT_FOUND when agent missing", async () => {
    mockFindWithRelations.mockImplementation(() => Promise.resolve(null));
    await expect(
      getControlAgentWithRelationsForTeam(db, TEAM_ID, "missing")
    ).rejects.toThrow("Agent not found");
  });
});

describe("listControlAgentsForTeam", () => {
  it("delegates to db with options", async () => {
    const result = await listControlAgentsForTeam(db, TEAM_ID, {
      status: "IDLE",
      limit: 10,
      offset: 5,
    });
    expect(result).toHaveLength(1);
    expect(mockList).toHaveBeenCalledWith(db, TEAM_ID, {
      status: "IDLE",
      limit: 10,
      offset: 5,
    });
  });
});

describe("countControlAgentsForTeam", () => {
  it("returns count", async () => {
    const result = await countControlAgentsForTeam(db, TEAM_ID);
    expect(result).toBe(1);
  });
});

describe("updateControlAgentForTeam", () => {
  it("updates agent successfully", async () => {
    await updateControlAgentForTeam(db, {
      teamId: TEAM_ID,
      agentId: AGENT_ID,
      data: { name: "renamed" },
    });
    expect(mockUpdate).toHaveBeenCalledWith(
      db,
      AGENT_ID,
      TEAM_ID,
      expect.objectContaining({ name: "renamed" })
    );
  });

  it("blocks update on terminated agent", async () => {
    mockFindById.mockImplementation(() =>
      Promise.resolve(makeAgent({ status: "TERMINATED" }))
    );
    await expect(
      updateControlAgentForTeam(db, {
        teamId: TEAM_ID,
        agentId: AGENT_ID,
        data: { name: "renamed" },
      })
    ).rejects.toThrow("Cannot update terminated agent");
  });

  it("detects reporting cycle", async () => {
    let callCount = 0;
    mockFindById.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return Promise.resolve(makeAgent({ id: AGENT_ID, status: "IDLE" }));
      }
      return Promise.resolve(
        makeAgent({ id: MANAGER_ID, reportsTo: AGENT_ID })
      );
    });

    await expect(
      updateControlAgentForTeam(db, {
        teamId: TEAM_ID,
        agentId: AGENT_ID,
        data: { reportsTo: MANAGER_ID },
      })
    ).rejects.toThrow("cycle");
  });

  it("records config revision when option enabled", async () => {
    const updatedAgent = makeAgent({ name: "renamed" });
    let findCallCount = 0;
    mockFindById.mockImplementation(() => {
      findCallCount += 1;
      if (findCallCount === 1) {
        return Promise.resolve(makeAgent());
      }
      return Promise.resolve(updatedAgent);
    });

    await updateControlAgentForTeam(db, {
      teamId: TEAM_ID,
      agentId: AGENT_ID,
      data: { name: "renamed" },
      options: { recordRevision: true, actorUserId: "user_01" },
    });

    expect(mockCreateConfigRevision).toHaveBeenCalledTimes(1);
    const revArg = (
      mockCreateConfigRevision.mock.calls[0] as unknown[]
    )[1] as Record<string, unknown>;
    expect(revArg.source).toBe("patch");
    expect(revArg.createdByUserId).toBe("user_01");
    expect((revArg.changedKeys as string[]).length).toBeGreaterThan(0);
  });

  it("skips revision when no config keys changed", async () => {
    mockFindById.mockImplementation(() => Promise.resolve(makeAgent()));

    await updateControlAgentForTeam(db, {
      teamId: TEAM_ID,
      agentId: AGENT_ID,
      data: { name: "test-agent" },
      options: { recordRevision: true },
    });

    expect(mockCreateConfigRevision).not.toHaveBeenCalled();
  });
});

describe("pauseControlAgentForTeam", () => {
  it("pauses an idle agent", async () => {
    await pauseControlAgentForTeam(db, TEAM_ID, AGENT_ID);
    expect(mockUpdateStatus).toHaveBeenCalledWith(
      db,
      AGENT_ID,
      TEAM_ID,
      "PAUSED"
    );
  });

  it("rejects pausing a terminated agent", async () => {
    mockFindById.mockImplementation(() =>
      Promise.resolve(makeAgent({ status: "TERMINATED" }))
    );
    await expect(
      pauseControlAgentForTeam(db, TEAM_ID, AGENT_ID)
    ).rejects.toThrow("Cannot pause terminated agent");
  });
});

describe("resumeControlAgentForTeam", () => {
  it("resumes a paused agent", async () => {
    mockFindById.mockImplementation(() =>
      Promise.resolve(makeAgent({ status: "PAUSED" }))
    );
    await resumeControlAgentForTeam(db, TEAM_ID, AGENT_ID);
    expect(mockUpdateStatus).toHaveBeenCalledWith(
      db,
      AGENT_ID,
      TEAM_ID,
      "IDLE"
    );
  });

  it("rejects resuming a terminated agent", async () => {
    mockFindById.mockImplementation(() =>
      Promise.resolve(makeAgent({ status: "TERMINATED" }))
    );
    await expect(
      resumeControlAgentForTeam(db, TEAM_ID, AGENT_ID)
    ).rejects.toThrow("Cannot resume agent in TERMINATED status");
  });

  it("rejects resuming a PENDING_APPROVAL agent", async () => {
    mockFindById.mockImplementation(() =>
      Promise.resolve(makeAgent({ status: "PENDING_APPROVAL" }))
    );
    await expect(
      resumeControlAgentForTeam(db, TEAM_ID, AGENT_ID)
    ).rejects.toThrow("Cannot resume agent in PENDING_APPROVAL status");
  });
});

describe("terminateControlAgentForTeam", () => {
  it("terminates agent and revokes active keys", async () => {
    const activeKey = makeApiKey({ id: "key_active", revokedAt: null });
    const revokedKey = makeApiKey({
      id: "key_revoked",
      revokedAt: new Date(),
    });
    mockListApiKeys.mockImplementation(() =>
      Promise.resolve([activeKey, revokedKey])
    );

    await terminateControlAgentForTeam(db, TEAM_ID, AGENT_ID);

    expect(mockUpdateStatus).toHaveBeenCalledWith(
      db,
      AGENT_ID,
      TEAM_ID,
      "TERMINATED"
    );
    expect(mockRevokeApiKey).toHaveBeenCalledTimes(1);
    expect(mockRevokeApiKey).toHaveBeenCalledWith(db, "key_active", TEAM_ID);
  });

  it("throws when agent does not exist", async () => {
    mockFindById.mockImplementation(() => Promise.resolve(null));
    await expect(
      terminateControlAgentForTeam(db, TEAM_ID, "missing")
    ).rejects.toThrow("Agent not found");
  });
});

describe("removeControlAgentForTeam", () => {
  it("deletes the agent", async () => {
    await removeControlAgentForTeam(db, TEAM_ID, AGENT_ID);
    expect(mockDelete).toHaveBeenCalledWith(db, AGENT_ID, TEAM_ID);
  });
});

describe("activateControlAgentForTeam", () => {
  it("activates a PENDING_APPROVAL agent", async () => {
    mockFindById.mockImplementation(() =>
      Promise.resolve(makeAgent({ status: "PENDING_APPROVAL" }))
    );
    await activateControlAgentForTeam(db, TEAM_ID, AGENT_ID);
    expect(mockUpdateStatus).toHaveBeenCalledWith(
      db,
      AGENT_ID,
      TEAM_ID,
      "IDLE"
    );
  });

  it("rejects activation for non-PENDING_APPROVAL agent", async () => {
    mockFindById.mockImplementation(() =>
      Promise.resolve(makeAgent({ status: "IDLE" }))
    );
    await expect(
      activateControlAgentForTeam(db, TEAM_ID, AGENT_ID)
    ).rejects.toThrow("Agent is not in PENDING_APPROVAL status");
  });
});

describe("createControlAgentApiKeyForTeam", () => {
  it("creates key and returns plaintext token", async () => {
    const result = await createControlAgentApiKeyForTeam(db, {
      teamId: TEAM_ID,
      agentId: AGENT_ID,
      name: "ci-key",
    });
    expect(result.token).toMatch(OPC_PREFIX);
    expect(result.token.length).toBeGreaterThan(10);
    expect(result.id).toBe("key_01");
    expect(result.name).toBe("default");
  });

  it("blocks key creation for terminated agent", async () => {
    mockFindById.mockImplementation(() =>
      Promise.resolve(makeAgent({ status: "TERMINATED" }))
    );
    await expect(
      createControlAgentApiKeyForTeam(db, {
        teamId: TEAM_ID,
        agentId: AGENT_ID,
        name: "ci-key",
      })
    ).rejects.toThrow("Cannot create API key for agent in TERMINATED status");
  });

  it("blocks key creation for PENDING_APPROVAL agent", async () => {
    mockFindById.mockImplementation(() =>
      Promise.resolve(makeAgent({ status: "PENDING_APPROVAL" }))
    );
    await expect(
      createControlAgentApiKeyForTeam(db, {
        teamId: TEAM_ID,
        agentId: AGENT_ID,
        name: "ci-key",
      })
    ).rejects.toThrow(
      "Cannot create API key for agent in PENDING_APPROVAL status"
    );
  });
});

describe("listControlAgentApiKeysForTeam", () => {
  it("delegates to db", async () => {
    const result = await listControlAgentApiKeysForTeam(db, TEAM_ID, AGENT_ID);
    expect(result).toHaveLength(1);
    expect(mockListApiKeys).toHaveBeenCalledWith(db, TEAM_ID, AGENT_ID);
  });
});

describe("revokeControlAgentApiKeyForTeam", () => {
  it("delegates to db", async () => {
    await revokeControlAgentApiKeyForTeam(db, "key_01", TEAM_ID);
    expect(mockRevokeApiKey).toHaveBeenCalledWith(db, "key_01", TEAM_ID);
  });
});

describe("revokeAllControlAgentApiKeysForTeam", () => {
  it("revokes only active keys", async () => {
    const active1 = makeApiKey({ id: "k1", revokedAt: null });
    const active2 = makeApiKey({ id: "k2", revokedAt: null });
    const revoked = makeApiKey({ id: "k3", revokedAt: new Date() });
    mockListApiKeys.mockImplementation(() =>
      Promise.resolve([active1, active2, revoked])
    );

    const result = await revokeAllControlAgentApiKeysForTeam(
      db,
      TEAM_ID,
      AGENT_ID
    );
    expect(result.revoked).toBe(2);
    expect(mockRevokeApiKey).toHaveBeenCalledTimes(2);
  });
});

describe("verifyControlAgentApiKey", () => {
  it("returns key and touches lastUsedAt on valid token", async () => {
    const result = await verifyControlAgentApiKey(db, "opc_validtoken");
    expect(result).not.toBeNull();
    expect(result?.id).toBe("key_01");
    expect(mockTouchApiKey).toHaveBeenCalledWith(db, "key_01");
  });

  it("returns null for unknown token", async () => {
    mockFindApiKeyByHash.mockImplementation(() => Promise.resolve(null));
    const result = await verifyControlAgentApiKey(db, "opc_unknown");
    expect(result).toBeNull();
    expect(mockTouchApiKey).not.toHaveBeenCalled();
  });
});

describe("listControlAgentConfigRevisionsForTeam", () => {
  it("delegates to db", async () => {
    const result = await listControlAgentConfigRevisionsForTeam(
      db,
      TEAM_ID,
      AGENT_ID
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe("patch");
  });
});

describe("rollbackControlAgentConfigForTeam", () => {
  it("applies revision config and records rollback revision", async () => {
    const revision = {
      id: "rev_01",
      teamId: TEAM_ID,
      agentId: AGENT_ID,
      source: "patch",
      changedKeys: ["name"],
      beforeConfig: { name: "old-name" },
      afterConfig: { name: "new-name" },
    };
    mockListConfigRevisions.mockImplementation(() =>
      Promise.resolve([revision])
    );

    const currentAgent = makeAgent({ name: "current-name" });
    mockFindById.mockImplementation(() => Promise.resolve(currentAgent));

    await rollbackControlAgentConfigForTeam(db, {
      teamId: TEAM_ID,
      agentId: AGENT_ID,
      revisionId: "rev_01",
      actorUserId: "user_01",
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      db,
      AGENT_ID,
      TEAM_ID,
      expect.objectContaining({ name: "new-name" })
    );

    expect(mockCreateConfigRevision).toHaveBeenCalledTimes(1);
    const revArg = (
      mockCreateConfigRevision.mock.calls[0] as unknown[]
    )[1] as Record<string, unknown>;
    expect(revArg.source).toBe("rollback");
    expect(revArg.rolledBackFromRevisionId).toBe("rev_01");
  });

  it("throws NOT_FOUND for unknown revision", async () => {
    mockListConfigRevisions.mockImplementation(() => Promise.resolve([]));
    await expect(
      rollbackControlAgentConfigForTeam(db, {
        teamId: TEAM_ID,
        agentId: AGENT_ID,
        revisionId: "nonexistent",
      })
    ).rejects.toThrow("Config revision not found");
  });
});

describe("getControlAgentChainOfCommand", () => {
  it("walks the reporting chain upward", async () => {
    const ceo = makeAgent({
      id: "ceo",
      name: "CEO",
      role: "ceo",
      title: "CEO",
      reportsTo: null,
    });
    const vp = makeAgent({
      id: "vp",
      name: "VP",
      role: "vp",
      title: "VP Eng",
      reportsTo: "ceo",
    });
    const worker = makeAgent({
      id: "worker",
      name: "Worker",
      role: "worker",
      title: null,
      reportsTo: "vp",
    });

    const agentMap: Record<string, typeof worker> = {
      worker,
      vp,
      ceo,
    };
    mockFindById.mockImplementation((_db, id) =>
      Promise.resolve(agentMap[id as string] ?? null)
    );

    const chain = await getControlAgentChainOfCommand(db, TEAM_ID, "worker");
    expect(chain).toHaveLength(2);
    expect(chain[0]?.id).toBe("vp");
    expect(chain[1]?.id).toBe("ceo");
  });

  it("returns empty chain for agent with no manager", async () => {
    mockFindById.mockImplementation(() =>
      Promise.resolve(makeAgent({ reportsTo: null }))
    );
    const chain = await getControlAgentChainOfCommand(db, TEAM_ID, AGENT_ID);
    expect(chain).toHaveLength(0);
  });
});

describe("getControlAgentOrgChartForTeam", () => {
  it("builds tree from flat agent list", async () => {
    const ceo = makeAgent({
      id: "ceo",
      name: "CEO",
      role: "ceo",
      title: "CEO",
      icon: null,
      status: "IDLE",
      reportsTo: null,
    });
    const vp = makeAgent({
      id: "vp",
      name: "VP",
      role: "vp",
      title: "VP Eng",
      icon: null,
      status: "IDLE",
      reportsTo: "ceo",
    });
    const dev = makeAgent({
      id: "dev",
      name: "Dev",
      role: "dev",
      title: null,
      icon: null,
      status: "RUNNING",
      reportsTo: "vp",
    });

    mockFindOrgChart.mockImplementation(() => Promise.resolve([ceo, vp, dev]));

    const tree = await getControlAgentOrgChartForTeam(db, TEAM_ID);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.id).toBe("ceo");
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children[0]?.id).toBe("vp");
    expect(tree[0]?.children[0]?.children).toHaveLength(1);
    expect(tree[0]?.children[0]?.children[0]?.id).toBe("dev");
    expect(tree[0]?.children[0]?.children[0]?.children).toHaveLength(0);
  });

  it("handles multiple root agents", async () => {
    const root1 = makeAgent({
      id: "r1",
      reportsTo: null,
      name: "Root1",
      role: "root",
    });
    const root2 = makeAgent({
      id: "r2",
      reportsTo: null,
      name: "Root2",
      role: "root",
    });
    mockFindOrgChart.mockImplementation(() => Promise.resolve([root1, root2]));

    const tree = await getControlAgentOrgChartForTeam(db, TEAM_ID);
    expect(tree).toHaveLength(2);
  });
});
