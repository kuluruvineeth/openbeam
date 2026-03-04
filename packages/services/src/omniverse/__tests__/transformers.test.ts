import { describe, expect, it } from "bun:test";
import type {
  OmniverseTransformContext,
  ParsedPrim,
} from "@openplane/types/services/connectors/omniverse";
import {
  type PrimTransformParams,
  transformPrim,
  transformPrims,
} from "../transformers/prim";

const baseContext: OmniverseTransformContext = {
  connectorId: "conn_omni_1",
  connectorType: "OMNIVERSE",
  teamId: "team_1",
  workspaceId: "ws_1",
  nucleusUrl: "https://nucleus.example.com",
  projectPath: "/Projects/DigitalTwin",
};

const stageParams: PrimTransformParams = {
  stagePath: "/Projects/DigitalTwin/Factory.usd",
};

function createMockPrim(overrides?: Partial<ParsedPrim>): ParsedPrim {
  return {
    path: "/World/Factory/ConveyorBelt_01",
    name: "ConveyorBelt_01",
    typeName: "Mesh",
    parentPath: "/World/Factory",
    isActive: true,
    transform: {
      translate: [10.5, 0, 20.3],
      rotate: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
    bounds: {
      min: [8, 0, 18],
      max: [13, 2, 23],
    },
    properties: { purpose: "conveyor" },
    customData: { zone: "assembly" },
    assetInfo: { identifier: "conveyor-v2", version: "1.0" },
    relationships: ["/World/Factory/Motor_01"],
    ...overrides,
  };
}

describe("omniverse transformers", () => {
  describe("transformPrim", () => {
    it("transforms Mesh prim to digital_twin_asset", async () => {
      const doc = await transformPrim(
        createMockPrim(),
        baseContext,
        stageParams
      );

      expect(doc.id).toContain("conn_omni_1_prim_");
      expect(doc.connector_id).toBe("conn_omni_1");
      expect(doc.connector_type).toBe("OMNIVERSE");
      expect(doc.team_id).toBe("team_1");
      expect(doc.external_id).toBe("/World/Factory/ConveyorBelt_01");
      expect(doc.document_type).toBe("digital_twin_asset");
      expect(doc.document_subtype).toBe("mesh");
      expect(doc.title).toBe("ConveyorBelt_01");
      expect(doc.source_type).toBe("omniverse");
    });

    it("classifies Xform as digital_twin_zone", async () => {
      const prim = createMockPrim({ typeName: "Xform" });
      const doc = await transformPrim(prim, baseContext, stageParams);
      expect(doc.document_type).toBe("digital_twin_zone");
    });

    it("classifies Scope as digital_twin_zone", async () => {
      const prim = createMockPrim({ typeName: "Scope" });
      const doc = await transformPrim(prim, baseContext, stageParams);
      expect(doc.document_type).toBe("digital_twin_zone");
    });

    it("classifies Camera as digital_twin_sensor", async () => {
      const prim = createMockPrim({ typeName: "Camera" });
      const doc = await transformPrim(prim, baseContext, stageParams);
      expect(doc.document_type).toBe("digital_twin_sensor");
    });

    it("classifies Light as digital_twin_sensor", async () => {
      const prim = createMockPrim({ typeName: "Light" });
      const doc = await transformPrim(prim, baseContext, stageParams);
      expect(doc.document_type).toBe("digital_twin_sensor");
    });

    it("classifies Material as digital_twin_material", async () => {
      const prim = createMockPrim({ typeName: "Material" });
      const doc = await transformPrim(prim, baseContext, stageParams);
      expect(doc.document_type).toBe("digital_twin_material");
    });

    it("defaults unknown types to digital_twin_asset", async () => {
      const prim = createMockPrim({ typeName: "CustomType" });
      const doc = await transformPrim(prim, baseContext, stageParams);
      expect(doc.document_type).toBe("digital_twin_asset");
    });

    it("builds content with type, path, and transform", async () => {
      const doc = await transformPrim(
        createMockPrim(),
        baseContext,
        stageParams
      );

      expect(doc.content).toContain("Type: Mesh");
      expect(doc.content).toContain("Path: /World/Factory/ConveyorBelt_01");
      expect(doc.content).toContain("Stage: /Projects/DigitalTwin/Factory.usd");
      expect(doc.content).toContain("Active: true");
      expect(doc.content).toContain("Position: (10.5, 0, 20.3)");
      expect(doc.content).toContain("Scale: (1, 1, 1)");
      expect(doc.content).toContain("Asset: conveyor-v2");
      expect(doc.content).toContain("Relations: 1");
    });

    it("includes spatial metadata", async () => {
      const doc = await transformPrim(
        createMockPrim(),
        baseContext,
        stageParams
      );

      expect(doc.metadata?.primPath).toBe("/World/Factory/ConveyorBelt_01");
      expect(doc.metadata?.primType).toBe("Mesh");
      expect(doc.metadata?.stagePath).toBe("/Projects/DigitalTwin/Factory.usd");
      expect(doc.metadata?.translateX).toBe(10.5);
      expect(doc.metadata?.translateY).toBe(0);
      expect(doc.metadata?.translateZ).toBe(20.3);
    });

    it("includes bounds metadata", async () => {
      const doc = await transformPrim(
        createMockPrim(),
        baseContext,
        stageParams
      );

      expect(doc.metadata?.boundsMinX).toBe(8);
      expect(doc.metadata?.boundsMaxX).toBe(13);
    });

    it("includes asset info metadata", async () => {
      const doc = await transformPrim(
        createMockPrim(),
        baseContext,
        stageParams
      );

      expect(doc.metadata?.assetIdentifier).toBe("conveyor-v2");
      expect(doc.metadata?.assetVersion).toBe("1.0");
    });

    it("sets parent_id from parentPath", async () => {
      const doc = await transformPrim(
        createMockPrim(),
        baseContext,
        stageParams
      );
      expect(doc.parent_id).toContain("conn_omni_1_prim_");
    });

    it("handles prim without parent", async () => {
      const prim = createMockPrim({ parentPath: undefined });
      const doc = await transformPrim(prim, baseContext, stageParams);
      expect(doc.parent_id).toBeUndefined();
    });

    it("handles prim without transform or bounds", async () => {
      const prim = createMockPrim({
        transform: undefined,
        bounds: undefined,
        assetInfo: undefined,
        relationships: [],
      });
      const doc = await transformPrim(prim, baseContext, stageParams);

      expect(doc.metadata?.translateX).toBeUndefined();
      expect(doc.metadata?.boundsMinX).toBeUndefined();
      expect(doc.metadata?.assetIdentifier).toBeUndefined();
    });

    it("builds URL with nucleus URL and stage path", async () => {
      const doc = await transformPrim(
        createMockPrim(),
        baseContext,
        stageParams
      );
      expect(doc.url).toBe(
        "https://nucleus.example.com/Projects/DigitalTwin/Factory.usd#/World/Factory/ConveyorBelt_01"
      );
    });

    it("sets source_path to prim path", async () => {
      const doc = await transformPrim(
        createMockPrim(),
        baseContext,
        stageParams
      );
      expect(doc.source_path).toBe("/World/Factory/ConveyorBelt_01");
    });

    it("generates deterministic checksums", async () => {
      const prim = createMockPrim();
      const doc1 = await transformPrim(prim, baseContext, stageParams);
      const doc2 = await transformPrim(prim, baseContext, stageParams);
      expect(doc1.checksum).toBe(doc2.checksum);
    });

    it("sets access_control with team ID", async () => {
      const doc = await transformPrim(
        createMockPrim(),
        baseContext,
        stageParams
      );
      expect(doc.access_control).toEqual(["team:team_1"]);
    });

    it("transforms multiple prims", async () => {
      const prims = [
        createMockPrim({ path: "/a", name: "A" }),
        createMockPrim({ path: "/b", name: "B" }),
      ];
      const docs = await transformPrims(prims, baseContext, stageParams);
      expect(docs).toHaveLength(2);
      expect(docs[0]?.title).toBe("A");
      expect(docs[1]?.title).toBe("B");
    });
  });
});
