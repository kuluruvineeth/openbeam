import { describe, expect, it } from "bun:test";
import type {
  NodeRedFlow,
  NodeRedNode,
  NodeRedNodeType,
  NodeRedSyncBatch,
  NodeRedTransformContext,
} from "@openbeam/types/services/connectors/nodered";
import type { GenericDocument } from "@openbeam/vespa";
import type { NodeRedClient } from "../client";
import { fullSync } from "../sync/full";

function createMockFlow(overrides?: Partial<NodeRedFlow>): NodeRedFlow {
  return {
    id: "flow-001",
    type: "tab",
    label: "Temperature Monitor",
    ...overrides,
  };
}

function createMockNode(overrides?: Partial<NodeRedNode>): NodeRedNode {
  return {
    id: "node-001",
    type: "inject",
    z: "flow-001",
    name: "Timer",
    ...overrides,
  };
}

function createMockNodeType(
  overrides?: Partial<NodeRedNodeType>
): NodeRedNodeType {
  return {
    id: "node-red-contrib-mqtt",
    name: "MQTT",
    types: ["mqtt-broker", "mqtt in"],
    enabled: true,
    local: false,
    module: "node-red-contrib-mqtt",
    version: "1.0.0",
    ...overrides,
  };
}

function createMockClient(options?: {
  flows?: Array<NodeRedFlow | NodeRedNode>;
  nodeTypes?: NodeRedNodeType[];
}): NodeRedClient {
  return {
    connectorId: "conn_nodered_1",
    getFlows: async () =>
      options?.flows ?? [
        createMockFlow(),
        createMockNode(),
        createMockNode({ id: "node-002", type: "debug", z: "flow-001" }),
      ],
    getFlow: async (id: string) => createMockFlow({ id }),
    getNodes: async () => options?.nodeTypes ?? [createMockNodeType()],
    getSettings: async () => ({
      httpNodeRoot: "/",
      version: "3.0.0",
      paletteCategories: [],
    }),
    healthCheck: async () => true,
  } as unknown as NodeRedClient;
}

const baseContext: NodeRedTransformContext = {
  connectorId: "conn_nodered_1",
  connectorType: "NODERED",
  teamId: "team_1",
  workspaceId: "ws_1",
  baseUrl: "https://nodered.example.com",
};

describe("nodered sync", () => {
  describe("fullSync", () => {
    it("yields flow batch from tab entries", async () => {
      const client = createMockClient();
      const batches: NodeRedSyncBatch<GenericDocument>[] = [];
      for await (const batch of fullSync(client, baseContext)) {
        batches.push(batch);
      }

      const flowBatch = batches.find((b) => b.stage === "flows");
      expect(flowBatch).toBeDefined();
      expect(flowBatch?.items.length).toBeGreaterThan(0);
    });

    it("yields node type batch when syncNodes is true", async () => {
      const client = createMockClient();
      const batches: NodeRedSyncBatch<GenericDocument>[] = [];
      for await (const batch of fullSync(client, baseContext, {
        syncNodes: true,
      })) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(2);
      expect(batches[0]?.stage).toBe("flows");
      expect(batches[1]?.stage).toBe("node_types");
    });

    it("skips node types when syncNodes is false", async () => {
      const client = createMockClient();
      const batches: NodeRedSyncBatch<GenericDocument>[] = [];
      for await (const batch of fullSync(client, baseContext, {
        syncNodes: false,
      })) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(1);
      expect(batches[0]?.stage).toBe("flows");
      expect(batches[0]?.hasMore).toBe(false);
    });

    it("filters subflows from flow list", async () => {
      const client = createMockClient({
        flows: [
          createMockFlow(),
          { id: "subflow-001", type: "subflow", label: "Sub" } as NodeRedFlow,
          createMockNode(),
        ],
      });

      const batches: NodeRedSyncBatch<GenericDocument>[] = [];
      for await (const batch of fullSync(client, baseContext)) {
        batches.push(batch);
      }

      const flowBatch = batches.find((b) => b.stage === "flows");
      expect(flowBatch?.items).toHaveLength(1);
    });

    it("associates nodes to correct flow by z field", async () => {
      const client = createMockClient({
        flows: [
          createMockFlow({ id: "flow-A", label: "Flow A" }),
          createMockFlow({ id: "flow-B", label: "Flow B" }),
          createMockNode({ id: "n1", z: "flow-A" }),
          createMockNode({ id: "n2", z: "flow-A" }),
          createMockNode({ id: "n3", z: "flow-B" }),
        ],
      });

      const batches: NodeRedSyncBatch<GenericDocument>[] = [];
      for await (const batch of fullSync(client, baseContext)) {
        batches.push(batch);
      }

      const flowBatch = batches.find((b) => b.stage === "flows");
      expect(flowBatch?.items).toHaveLength(2);

      const flowA = flowBatch?.items.find((d) => d.title.includes("Flow A"));
      const flowB = flowBatch?.items.find((d) => d.title.includes("Flow B"));
      expect(flowA?.metadata?.nodeCount).toBe(2);
      expect(flowB?.metadata?.nodeCount).toBe(1);
    });
  });
});
