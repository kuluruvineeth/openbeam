import { describe, expect, it } from "bun:test";
import type {
  OpcUaNode,
  OpcUaTransformContext,
} from "@openplane/types/services/connectors/opcua";
import { transformNode, transformNodes } from "../transformers/node";

const baseContext: OpcUaTransformContext = {
  connectorId: "conn_opcua_1",
  connectorType: "OPCUA",
  teamId: "team_1",
  workspaceId: "ws_1",
  endpointUrl: "opc.tcp://server:4840",
};

function createMockNode(overrides?: Partial<OpcUaNode>): OpcUaNode {
  return {
    nodeId: "ns=2;s=Temperature.Value",
    browseName: "TemperatureValue",
    displayName: "Temperature Value",
    nodeClass: 2,
    typeDefinition: "BaseDataVariableType",
    dataType: "Double",
    engineeringUnits: "degC",
    value: 72.5,
    description: "Current temperature reading",
    ...overrides,
  };
}

describe("opcua transformers", () => {
  describe("transformNode", () => {
    it("generates correct ID format with encoded nodeId", async () => {
      const doc = await transformNode(createMockNode(), baseContext);

      expect(doc.id).toBe(
        `conn_opcua_1_node_${encodeURIComponent("ns=2;s=Temperature.Value")}`
      );
    });

    it("uses displayName as title when present", async () => {
      const doc = await transformNode(createMockNode(), baseContext);

      expect(doc.title).toBe("Temperature Value");
    });

    it("falls back to browseName when displayName is empty", async () => {
      const doc = await transformNode(
        createMockNode({ displayName: "" }),
        baseContext
      );

      expect(doc.title).toBe("TemperatureValue");
    });

    it("sets document_type to device_config", async () => {
      const doc = await transformNode(createMockNode(), baseContext);

      expect(doc.document_type).toBe("device_config");
    });

    it("sets document_subtype from nodeClass label", async () => {
      const doc = await transformNode(createMockNode(), baseContext);

      expect(doc.document_subtype).toBe("Variable");
    });

    it("builds content with Browse Name, Display Name, Node Class, and optional fields", async () => {
      const doc = await transformNode(createMockNode(), baseContext);

      expect(doc.content).toContain("Browse Name: TemperatureValue");
      expect(doc.content).toContain("Display Name: Temperature Value");
      expect(doc.content).toContain("Node Class: Variable");
      expect(doc.content).toContain("Type Definition: BaseDataVariableType");
      expect(doc.content).toContain("Data Type: Double");
      expect(doc.content).toContain("Engineering Units: degC");
      expect(doc.content).toContain("Value: 72.5");
      expect(doc.content).toContain("Description: Current temperature reading");
    });

    it("omits display name in content when same as browseName", async () => {
      const doc = await transformNode(
        createMockNode({
          browseName: "Temperature",
          displayName: "Temperature",
        }),
        baseContext
      );

      expect(doc.content).toContain("Browse Name: Temperature");
      expect(doc.content).not.toContain("Display Name:");
    });

    it("includes node metadata", async () => {
      const doc = await transformNode(createMockNode(), baseContext);

      expect(doc.metadata?.nodeId).toBe("ns=2;s=Temperature.Value");
      expect(doc.metadata?.browseName).toBe("TemperatureValue");
      expect(doc.metadata?.nodeClass).toBe("Variable");
      expect(doc.metadata?.dataType).toBe("Double");
      expect(doc.metadata?.typeDefinition).toBe("BaseDataVariableType");
      expect(doc.metadata?.engineeringUnits).toBe("degC");
      expect(doc.metadata?.value).toBe("72.5");
    });

    it("maps all 8 node classes correctly", async () => {
      const mappings: [number, string][] = [
        [1, "Object"],
        [2, "Variable"],
        [4, "Method"],
        [8, "ObjectType"],
        [16, "VariableType"],
        [32, "ReferenceType"],
        [64, "DataType"],
        [128, "View"],
      ];

      for (const [nodeClass, expected] of mappings) {
        const doc = await transformNode(
          createMockNode({ nodeClass }),
          baseContext
        );
        expect(doc.document_subtype).toBe(expected);
        expect(doc.metadata?.nodeClass).toBe(expected);
      }
    });

    it("handles unknown nodeClass", async () => {
      const doc = await transformNode(
        createMockNode({ nodeClass: 256 }),
        baseContext
      );

      expect(doc.document_subtype).toBe("Unknown(256)");
      expect(doc.metadata?.nodeClass).toBe("Unknown(256)");
    });

    it("stringifies string values as-is", async () => {
      const doc = await transformNode(
        createMockNode({ value: "hello" }),
        baseContext
      );

      expect(doc.metadata?.value).toBe("hello");
    });

    it("stringifies number values with String()", async () => {
      const doc = await transformNode(
        createMockNode({ value: 42 }),
        baseContext
      );

      expect(doc.metadata?.value).toBe("42");
    });

    it("stringifies boolean values with String()", async () => {
      const doc = await transformNode(
        createMockNode({ value: true }),
        baseContext
      );

      expect(doc.metadata?.value).toBe("true");
    });

    it("stringifies object values with JSON.stringify", async () => {
      const doc = await transformNode(
        createMockNode({ value: { x: 1, y: 2 } }),
        baseContext
      );

      expect(doc.metadata?.value).toBe(JSON.stringify({ x: 1, y: 2 }));
    });

    it("sets core document fields", async () => {
      const doc = await transformNode(createMockNode(), baseContext);

      expect(doc.connector_id).toBe("conn_opcua_1");
      expect(doc.connector_type).toBe("OPCUA");
      expect(doc.team_id).toBe("team_1");
      expect(doc.workspace_id).toBe("ws_1");
      expect(doc.external_id).toBe("ns=2;s=Temperature.Value");
      expect(doc.source_type).toBe("opcua");
      expect(doc.source_name).toBe("OPC-UA");
      expect(doc.is_public).toBe(false);
      expect(doc.access_control).toEqual(["team:team_1"]);
    });

    it("generates deterministic checksums", async () => {
      const node = createMockNode();
      const doc1 = await transformNode(node, baseContext);
      const doc2 = await transformNode(node, baseContext);

      expect(doc1.checksum).toBe(doc2.checksum);
      expect(doc1.checksum).toBeDefined();
    });

    it("produces different checksum when content changes", async () => {
      const node1 = createMockNode({ value: 72.5 });
      const node2 = createMockNode({ value: 99.0 });

      const doc1 = await transformNode(node1, baseContext);
      const doc2 = await transformNode(node2, baseContext);

      expect(doc1.checksum).not.toBe(doc2.checksum);
    });
  });

  describe("transformNodes", () => {
    it("transforms multiple nodes", async () => {
      const nodes = [
        createMockNode({ nodeId: "ns=2;s=Temp", browseName: "Temp" }),
        createMockNode({ nodeId: "ns=2;s=Pressure", browseName: "Pressure" }),
      ];

      const docs = await transformNodes(nodes, baseContext);

      expect(docs).toHaveLength(2);
      expect(docs[0]?.external_id).toBe("ns=2;s=Temp");
      expect(docs[1]?.external_id).toBe("ns=2;s=Pressure");
    });
  });
});
