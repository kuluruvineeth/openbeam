import { describe, expect, it } from "bun:test";
import type {
  NodeRedFlow,
  NodeRedNode,
  NodeRedNodeType,
  NodeRedTransformContext,
} from "@openbeam/types/services/connectors/nodered";
import { transformFlow, transformFlows } from "../transformers/flow";
import {
  transformNodeType,
  transformNodeTypes,
} from "../transformers/node-type";

const baseContext: NodeRedTransformContext = {
  connectorId: "conn_nodered_1",
  connectorType: "NODERED",
  teamId: "team_1",
  workspaceId: "ws_1",
  baseUrl: "https://nodered.example.com",
};

function createMockFlow(overrides?: Partial<NodeRedFlow>): NodeRedFlow {
  return {
    id: "flow-001",
    type: "tab",
    label: "Temperature Monitor",
    disabled: false,
    info: "Monitors temperature readings from factory sensors",
    env: [
      { name: "THRESHOLD", value: "75", type: "num" },
      { name: "UNIT", value: "celsius", type: "str" },
    ],
    ...overrides,
  };
}

function createMockNode(overrides?: Partial<NodeRedNode>): NodeRedNode {
  return {
    id: "node-001",
    type: "inject",
    z: "flow-001",
    name: "Trigger",
    ...overrides,
  };
}

function createMockNodeType(
  overrides?: Partial<NodeRedNodeType>
): NodeRedNodeType {
  return {
    id: "node-red-contrib-mqtt",
    name: "MQTT Nodes",
    types: ["mqtt in", "mqtt out", "mqtt broker"],
    enabled: true,
    local: false,
    module: "node-red-contrib-mqtt",
    version: "1.3.2",
    ...overrides,
  };
}

describe("nodered transformers", () => {
  describe("transformFlow", () => {
    it("generates correct ID format", async () => {
      const flow = createMockFlow();
      const nodes = [createMockNode()];
      const doc = await transformFlow(flow, baseContext, nodes);

      expect(doc.id).toBe("conn_nodered_1_flow_flow-001");
    });

    it("uses label as title when present", async () => {
      const doc = await transformFlow(createMockFlow(), baseContext, [
        createMockNode(),
      ]);

      expect(doc.title).toBe("Temperature Monitor");
    });

    it("falls back to Flow {id} when label is absent", async () => {
      const doc = await transformFlow(
        createMockFlow({ label: undefined }),
        baseContext,
        []
      );

      expect(doc.title).toBe("Flow flow-001");
    });

    it("sets document_type to automation_flow", async () => {
      const doc = await transformFlow(createMockFlow(), baseContext, []);

      expect(doc.document_type).toBe("automation_flow");
    });

    it("builds content with Label, Type, Info, Environment Variables, and Node Count", async () => {
      const nodes = [
        createMockNode({ id: "n1" }),
        createMockNode({ id: "n2" }),
        createMockNode({ id: "n3" }),
      ];
      const doc = await transformFlow(createMockFlow(), baseContext, nodes);

      expect(doc.content).toContain("Label: Temperature Monitor");
      expect(doc.content).toContain("Type: tab");
      expect(doc.content).toContain(
        "Info: Monitors temperature readings from factory sensors"
      );
      expect(doc.content).toContain("Environment Variables: THRESHOLD, UNIT");
      expect(doc.content).toContain("Node Count: 3");
    });

    it("includes flow metadata", async () => {
      const nodes = [createMockNode(), createMockNode({ id: "n2" })];
      const doc = await transformFlow(createMockFlow(), baseContext, nodes);

      expect(doc.metadata?.flowId).toBe("flow-001");
      expect(doc.metadata?.type).toBe("tab");
      expect(doc.metadata?.disabled).toBe(false);
      expect(doc.metadata?.nodeCount).toBe(2);
    });

    it("builds URL with baseUrl and flow ID", async () => {
      const doc = await transformFlow(createMockFlow(), baseContext, []);

      expect(doc.url).toBe("https://nodered.example.com/#flow/flow-001");
    });

    it("counts nodes from flowNodes parameter", async () => {
      const emptyDoc = await transformFlow(createMockFlow(), baseContext, []);
      expect(emptyDoc.content).toContain("Node Count: 0");

      const fiveNodes = Array.from({ length: 5 }, (_, i) =>
        createMockNode({ id: `n${i}` })
      );
      const fullDoc = await transformFlow(
        createMockFlow(),
        baseContext,
        fiveNodes
      );
      expect(fullDoc.content).toContain("Node Count: 5");
    });

    it("sets core document fields", async () => {
      const doc = await transformFlow(createMockFlow(), baseContext, []);

      expect(doc.connector_id).toBe("conn_nodered_1");
      expect(doc.connector_type).toBe("NODERED");
      expect(doc.team_id).toBe("team_1");
      expect(doc.workspace_id).toBe("ws_1");
      expect(doc.source_type).toBe("nodered");
      expect(doc.source_name).toBe("Node-RED");
      expect(doc.is_public).toBe(false);
      expect(doc.access_control).toEqual(["team:team_1"]);
    });

    it("generates deterministic checksums", async () => {
      const flow = createMockFlow();
      const nodes = [createMockNode()];
      const doc1 = await transformFlow(flow, baseContext, nodes);
      const doc2 = await transformFlow(flow, baseContext, nodes);

      expect(doc1.checksum).toBe(doc2.checksum);
      expect(doc1.checksum).toBeDefined();
    });
  });

  describe("transformFlows", () => {
    it("transforms multiple flows and filters nodes by flow ID", async () => {
      const flows = [
        createMockFlow({ id: "f1", label: "Flow A" }),
        createMockFlow({ id: "f2", label: "Flow B" }),
      ];
      const allNodes = [
        createMockNode({ id: "n1", z: "f1" }),
        createMockNode({ id: "n2", z: "f1" }),
        createMockNode({ id: "n3", z: "f2" }),
      ];

      const docs = await transformFlows(flows, baseContext, allNodes);

      expect(docs).toHaveLength(2);
      expect(docs[0]?.metadata?.nodeCount).toBe(2);
      expect(docs[1]?.metadata?.nodeCount).toBe(1);
    });
  });

  describe("transformNodeType", () => {
    it("generates correct ID format", async () => {
      const doc = await transformNodeType(createMockNodeType(), baseContext);

      expect(doc.id).toBe("conn_nodered_1_nodetype_node-red-contrib-mqtt");
    });

    it("uses name as title when present", async () => {
      const doc = await transformNodeType(createMockNodeType(), baseContext);

      expect(doc.title).toBe("MQTT Nodes");
    });

    it("falls back to id when name is empty", async () => {
      const doc = await transformNodeType(
        createMockNodeType({ name: "" }),
        baseContext
      );

      expect(doc.title).toBe("node-red-contrib-mqtt");
    });

    it("sets document_type to device_config", async () => {
      const doc = await transformNodeType(createMockNodeType(), baseContext);

      expect(doc.document_type).toBe("device_config");
    });

    it("builds content with Module, Version, Types, and Enabled", async () => {
      const doc = await transformNodeType(createMockNodeType(), baseContext);

      expect(doc.content).toContain("Module: node-red-contrib-mqtt");
      expect(doc.content).toContain("Version: 1.3.2");
      expect(doc.content).toContain("Types: mqtt in, mqtt out, mqtt broker");
      expect(doc.content).toContain("Enabled: true");
    });

    it("includes node type metadata", async () => {
      const doc = await transformNodeType(createMockNodeType(), baseContext);

      expect(doc.metadata?.nodeTypeId).toBe("node-red-contrib-mqtt");
      expect(doc.metadata?.module).toBe("node-red-contrib-mqtt");
      expect(doc.metadata?.version).toBe("1.3.2");
      expect(doc.metadata?.enabled).toBe(true);
      expect(doc.metadata?.local).toBe(false);
      expect(doc.metadata?.types).toBe(
        JSON.stringify(["mqtt in", "mqtt out", "mqtt broker"])
      );
    });

    it("generates deterministic checksums", async () => {
      const nodeType = createMockNodeType();
      const doc1 = await transformNodeType(nodeType, baseContext);
      const doc2 = await transformNodeType(nodeType, baseContext);

      expect(doc1.checksum).toBe(doc2.checksum);
      expect(doc1.checksum).toBeDefined();
    });

    it("transforms multiple node types", async () => {
      const nodeTypes = [
        createMockNodeType({ id: "nt1", name: "Type A" }),
        createMockNodeType({ id: "nt2", name: "Type B" }),
      ];

      const docs = await transformNodeTypes(nodeTypes, baseContext);

      expect(docs).toHaveLength(2);
      expect(docs[0]?.external_id).toBe("nt1");
      expect(docs[1]?.external_id).toBe("nt2");
    });
  });
});
