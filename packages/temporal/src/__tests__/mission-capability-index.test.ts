import { describe, expect, it } from "vitest";

interface AgentPoolEntry {
  agentId: string;
  agentName: string;
  capabilities: string[];
  leasedTo: string | null;
  leaseExpiresAt: number | null;
  leaseTaskId: string | null;
  leasePriority: "P0" | "P1" | "P2" | "P3" | null;
}

function buildCapabilityIndex(
  agents: Map<string, AgentPoolEntry>
): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  for (const agent of agents.values()) {
    for (const capability of agent.capabilities) {
      let set = index.get(capability);
      if (!set) {
        set = new Set();
        index.set(capability, set);
      }
      set.add(agent.agentId);
    }
  }
  return index;
}

function addToCapabilityIndex(
  index: Map<string, Set<string>>,
  agentId: string,
  capabilities: string[]
): void {
  for (const capability of capabilities) {
    let set = index.get(capability);
    if (!set) {
      set = new Set();
      index.set(capability, set);
    }
    set.add(agentId);
  }
}

function removeFromCapabilityIndex(
  index: Map<string, Set<string>>,
  agentId: string,
  capabilities: string[]
): void {
  for (const capability of capabilities) {
    const set = index.get(capability);
    if (set) {
      set.delete(agentId);
      if (set.size === 0) {
        index.delete(capability);
      }
    }
  }
}

function findBestAgent(
  agents: Map<string, AgentPoolEntry>,
  requiredCapabilities: string[],
  capabilityIndex: Map<string, Set<string>>,
  now: number
): AgentPoolEntry | null {
  let candidateIds: Set<string> | null = null;

  for (const capability of requiredCapabilities) {
    const agentsWithCap = capabilityIndex.get(capability);
    if (!agentsWithCap || agentsWithCap.size === 0) {
      return null;
    }

    if (candidateIds === null) {
      candidateIds = new Set(agentsWithCap);
    } else {
      for (const id of candidateIds) {
        if (!agentsWithCap.has(id)) {
          candidateIds.delete(id);
        }
      }
    }

    if (candidateIds.size === 0) {
      return null;
    }
  }

  if (!candidateIds) {
    return null;
  }

  let bestAgent: AgentPoolEntry | null = null;
  let bestScore = -1;

  for (const agentId of candidateIds) {
    const agent = agents.get(agentId);
    if (!agent) {
      continue;
    }

    const isAvailable =
      agent.leasedTo === null ||
      (agent.leaseExpiresAt !== null && agent.leaseExpiresAt < now);

    if (!isAvailable) {
      continue;
    }

    const matchedCapabilities = requiredCapabilities.filter((cap) =>
      agent.capabilities.includes(cap)
    ).length;
    const score = matchedCapabilities / agent.capabilities.length;

    if (score > bestScore) {
      bestScore = score;
      bestAgent = agent;
    }
  }

  return bestAgent;
}

function createAgent(
  id: string,
  capabilities: string[],
  leased = false
): AgentPoolEntry {
  return {
    agentId: id,
    agentName: `Agent ${id}`,
    capabilities,
    leasedTo: leased ? "some-task" : null,
    leaseExpiresAt: leased ? Date.now() + 60_000 : null,
    leaseTaskId: leased ? "task-x" : null,
    leasePriority: leased ? "P2" : null,
  };
}

describe("Capability Index (4.9)", () => {
  describe("buildCapabilityIndex", () => {
    it("builds index from agent pool", () => {
      const agents = new Map<string, AgentPoolEntry>();
      agents.set("a1", createAgent("a1", ["research", "writing"]));
      agents.set("a2", createAgent("a2", ["analysis", "research"]));
      agents.set("a3", createAgent("a3", ["coding"]));

      const index = buildCapabilityIndex(agents);

      expect(index.get("research")?.size).toBe(2);
      expect(index.get("research")?.has("a1")).toBe(true);
      expect(index.get("research")?.has("a2")).toBe(true);
      expect(index.get("writing")?.size).toBe(1);
      expect(index.get("coding")?.size).toBe(1);
      expect(index.get("nonexistent")).toBeUndefined();
    });

    it("handles empty agent pool", () => {
      const agents = new Map<string, AgentPoolEntry>();
      const index = buildCapabilityIndex(agents);
      expect(index.size).toBe(0);
    });
  });

  describe("addToCapabilityIndex", () => {
    it("adds new agent to existing capabilities", () => {
      const index = new Map<string, Set<string>>();
      index.set("research", new Set(["a1"]));

      addToCapabilityIndex(index, "a2", ["research", "writing"]);

      expect(index.get("research")?.size).toBe(2);
      expect(index.get("research")?.has("a2")).toBe(true);
      expect(index.get("writing")?.size).toBe(1);
    });

    it("creates new capability entries when needed", () => {
      const index = new Map<string, Set<string>>();

      addToCapabilityIndex(index, "a1", ["coding", "debugging"]);

      expect(index.size).toBe(2);
      expect(index.get("coding")?.has("a1")).toBe(true);
      expect(index.get("debugging")?.has("a1")).toBe(true);
    });
  });

  describe("removeFromCapabilityIndex", () => {
    it("removes agent from capability sets", () => {
      const index = new Map<string, Set<string>>();
      index.set("research", new Set(["a1", "a2"]));
      index.set("writing", new Set(["a1"]));

      removeFromCapabilityIndex(index, "a1", ["research", "writing"]);

      expect(index.get("research")?.size).toBe(1);
      expect(index.get("research")?.has("a1")).toBe(false);
      expect(index.has("writing")).toBe(false);
    });

    it("removes empty capability keys", () => {
      const index = new Map<string, Set<string>>();
      index.set("solo-cap", new Set(["a1"]));

      removeFromCapabilityIndex(index, "a1", ["solo-cap"]);

      expect(index.has("solo-cap")).toBe(false);
    });

    it("handles removal of non-existent capability gracefully", () => {
      const index = new Map<string, Set<string>>();

      removeFromCapabilityIndex(index, "a1", ["nonexistent"]);

      expect(index.size).toBe(0);
    });
  });

  describe("findBestAgent with index", () => {
    it("finds agent matching all required capabilities", () => {
      const agents = new Map<string, AgentPoolEntry>();
      agents.set("a1", createAgent("a1", ["research", "writing"]));
      agents.set("a2", createAgent("a2", ["research", "analysis"]));
      agents.set("a3", createAgent("a3", ["coding"]));

      const index = buildCapabilityIndex(agents);
      const now = Date.now();

      const best = findBestAgent(agents, ["research", "writing"], index, now);

      expect(best?.agentId).toBe("a1");
    });

    it("returns null when no agent has all required capabilities", () => {
      const agents = new Map<string, AgentPoolEntry>();
      agents.set("a1", createAgent("a1", ["research"]));
      agents.set("a2", createAgent("a2", ["writing"]));

      const index = buildCapabilityIndex(agents);

      const best = findBestAgent(
        agents,
        ["research", "writing"],
        index,
        Date.now()
      );

      expect(best).toBeNull();
    });

    it("returns null for capability not in index", () => {
      const agents = new Map<string, AgentPoolEntry>();
      agents.set("a1", createAgent("a1", ["research"]));

      const index = buildCapabilityIndex(agents);

      const best = findBestAgent(
        agents,
        ["quantum-physics"],
        index,
        Date.now()
      );

      expect(best).toBeNull();
    });

    it("skips agents that are leased and not expired", () => {
      const agents = new Map<string, AgentPoolEntry>();
      agents.set("a1", createAgent("a1", ["research"], true));
      agents.set("a2", createAgent("a2", ["research", "analysis"]));

      const index = buildCapabilityIndex(agents);

      const best = findBestAgent(agents, ["research"], index, Date.now());

      expect(best?.agentId).toBe("a2");
    });

    it("prefers agent with higher capability match ratio", () => {
      const agents = new Map<string, AgentPoolEntry>();
      agents.set("specialist", createAgent("specialist", ["research"]));
      agents.set(
        "generalist",
        createAgent("generalist", [
          "research",
          "writing",
          "coding",
          "analysis",
          "debugging",
        ])
      );

      const index = buildCapabilityIndex(agents);

      const best = findBestAgent(agents, ["research"], index, Date.now());

      expect(best?.agentId).toBe("specialist");
    });

    it("considers expired leases as available", () => {
      const agents = new Map<string, AgentPoolEntry>();
      const expiredAgent: AgentPoolEntry = {
        ...createAgent("a1", ["research"]),
        leasedTo: "old-task",
        leaseExpiresAt: Date.now() - 10_000,
      };
      agents.set("a1", expiredAgent);

      const index = buildCapabilityIndex(agents);

      const best = findBestAgent(agents, ["research"], index, Date.now());

      expect(best?.agentId).toBe("a1");
    });
  });
});
