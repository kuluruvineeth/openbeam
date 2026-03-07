import { describe, expect, it } from "bun:test";
import type {
  OpcUaNode,
  OpcUaTransformContext,
} from "@openbeam/types/services/connectors/opcua";
import type { OpcUaClient } from "../client";
import { fullSync } from "../sync/full";

function createMockNode(overrides?: Partial<OpcUaNode>): OpcUaNode {
  return {
    nodeId: "ns=2;s=Temperature",
    browseName: "Temperature",
    displayName: "Room Temperature",
    nodeClass: 2,
    ...overrides,
  };
}

function createMockClient(options?: {
  nodes?: OpcUaNode[];
  connectFn?: () => Promise<void>;
  disconnectFn?: () => Promise<void>;
}): OpcUaClient {
  return {
    connectorId: "conn_opcua_1",
    connect:
      options?.connectFn ??
      (async () => {
        await Promise.resolve();
      }),
    disconnect:
      options?.disconnectFn ??
      (async () => {
        await Promise.resolve();
      }),
    browseNode: async () => [],
    browseTree: async () => options?.nodes ?? [createMockNode()],
    readNodeValue: async () => null,
    healthCheck: async () => true,
  };
}

const baseContext: OpcUaTransformContext = {
  connectorId: "conn_opcua_1",
  connectorType: "OPCUA",
  teamId: "team_1",
  workspaceId: "ws_1",
  endpointUrl: "opc.tcp://server:4840",
};

describe("opcua sync", () => {
  describe("fullSync", () => {
    it("yields single batch for small node count", async () => {
      const client = createMockClient({
        nodes: [
          createMockNode(),
          createMockNode({ nodeId: "ns=2;s=Humidity" }),
        ],
      });

      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext)) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(1);
      expect(batches[0]?.items).toHaveLength(2);
      expect(batches[0]?.hasMore).toBe(false);
    });

    it("batches nodes according to batchSize", async () => {
      const nodes = Array.from({ length: 5 }, (_, i) =>
        createMockNode({ nodeId: `ns=2;s=Node${i}` })
      );

      const client = createMockClient({ nodes });
      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext, {
        batchSize: 2,
      })) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(3);
      expect(batches[0]?.items).toHaveLength(2);
      expect(batches[1]?.items).toHaveLength(2);
      expect(batches[2]?.items).toHaveLength(1);
    });

    it("sets hasMore correctly across batches", async () => {
      const nodes = Array.from({ length: 4 }, (_, i) =>
        createMockNode({ nodeId: `ns=2;s=Node${i}` })
      );

      const client = createMockClient({ nodes });
      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext, {
        batchSize: 2,
      })) {
        batches.push(batch);
      }

      expect(batches[0]?.hasMore).toBe(true);
      expect(batches[1]?.hasMore).toBe(false);
    });

    it("tracks browsed node IDs in cursor", async () => {
      const nodes = [
        createMockNode({ nodeId: "ns=2;s=A" }),
        createMockNode({ nodeId: "ns=2;s=B" }),
        createMockNode({ nodeId: "ns=2;s=C" }),
      ];

      const client = createMockClient({ nodes });
      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext, {
        batchSize: 2,
      })) {
        batches.push(batch);
      }

      const lastBatch = batches.at(-1);
      expect(lastBatch?.cursor.browsedNodeIds).toEqual([
        "ns=2;s=A",
        "ns=2;s=B",
        "ns=2;s=C",
      ]);
    });

    it("connects before browsing and disconnects in finally", async () => {
      const callOrder: string[] = [];
      const client = createMockClient({
        connectFn: async () => {
          await Promise.resolve();
          callOrder.push("connect");
        },
        disconnectFn: async () => {
          await Promise.resolve();
          callOrder.push("disconnect");
        },
      });

      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext)) {
        callOrder.push("yield");
        batches.push(batch);
      }

      expect(callOrder[0]).toBe("connect");
      expect(callOrder.at(-1)).toBe("disconnect");
    });

    it("disconnects even when no nodes found", async () => {
      let disconnected = false;
      const client = createMockClient({
        nodes: [],
        disconnectFn: async () => {
          await Promise.resolve();
          disconnected = true;
        },
      });

      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext)) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(0);
      expect(disconnected).toBe(true);
    });
  });
});
