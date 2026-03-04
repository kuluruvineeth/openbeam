import { describe, expect, it } from "bun:test";
import {
  type Deployment,
  DeploymentSchema,
  DeploymentStatusSchema,
  FleetOverviewSchema,
  NodeFilterSchema,
  type NodeRegistration,
  NodeRegistrationSchema,
} from "../fleet";

const NOW = Date.now();

function makeNode(overrides: Partial<NodeRegistration> = {}): NodeRegistration {
  return NodeRegistrationSchema.parse({
    nodeId: "node-1",
    name: "Edge Node 1",
    tier: "standard",
    capabilities: {
      cpuCores: 4,
      ramMb: 8192,
      storageMb: 32_768,
      hasGpu: false,
      platform: "intel_nuc",
    },
    status: "healthy",
    version: "1.0.0",
    registeredAt: NOW,
    lastHeartbeatAt: NOW,
    ...overrides,
  });
}

describe("NodeRegistrationSchema", () => {
  it("parses valid registration", () => {
    const node = makeNode();
    expect(node.nodeId).toBe("node-1");
    expect(node.tags).toEqual({});
  });

  it("accepts tags and location", () => {
    const node = makeNode({
      tags: { env: "production", region: "us-west" },
      location: "Building A, Floor 3",
    });
    expect(node.tags.env).toBe("production");
    expect(node.location).toBe("Building A, Floor 3");
  });

  it("rejects empty nodeId", () => {
    expect(() => makeNode({ nodeId: "" })).toThrow();
  });
});

describe("NodeFilterSchema", () => {
  it("parses empty filter", () => {
    const filter = NodeFilterSchema.parse({});
    expect(filter.tiers).toBeUndefined();
    expect(filter.statuses).toBeUndefined();
  });

  it("parses filter with all fields", () => {
    const filter = NodeFilterSchema.parse({
      tiers: ["standard", "performance"],
      statuses: ["healthy"],
      tags: { env: "production" },
      minRamMb: 4096,
      hasGpu: true,
      location: "HQ",
    });
    expect(filter.tiers).toHaveLength(2);
    expect(filter.hasGpu).toBe(true);
  });
});

describe("DeploymentStatusSchema", () => {
  it("accepts all statuses", () => {
    for (const s of [
      "pending",
      "deploying",
      "active",
      "rolling_back",
      "failed",
    ]) {
      expect(DeploymentStatusSchema.parse(s)).toBe(s);
    }
  });
});

describe("DeploymentSchema", () => {
  it("parses valid deployment", () => {
    const deployment: Deployment = DeploymentSchema.parse({
      id: "deploy-1",
      version: "1.1.0",
      status: "deploying",
      targetNodes: ["node-1", "node-2"],
      startedAt: NOW,
    });
    expect(deployment.completedNodes).toEqual([]);
    expect(deployment.failedNodes).toEqual([]);
    expect(deployment.completedAt).toBeUndefined();
  });

  it("tracks completed and failed nodes", () => {
    const deployment = DeploymentSchema.parse({
      id: "deploy-2",
      version: "1.2.0",
      status: "active",
      targetNodes: ["node-1", "node-2", "node-3"],
      completedNodes: ["node-1", "node-2"],
      failedNodes: ["node-3"],
      startedAt: NOW - 60_000,
      completedAt: NOW,
    });
    expect(deployment.completedNodes).toHaveLength(2);
    expect(deployment.failedNodes).toHaveLength(1);
  });
});

describe("FleetOverviewSchema", () => {
  it("parses fleet overview", () => {
    const overview = FleetOverviewSchema.parse({
      totalNodes: 10,
      healthyNodes: 8,
      degradedNodes: 1,
      unhealthyNodes: 1,
      tierDistribution: {
        sensor_gateway: 2,
        standard: 5,
        performance: 2,
        enterprise: 1,
      },
      activeDeployments: 1,
      totalDocuments: 500_000,
      lastUpdatedAt: NOW,
    });
    expect(overview.totalNodes).toBe(10);
    expect(overview.tierDistribution.standard).toBe(5);
  });
});
