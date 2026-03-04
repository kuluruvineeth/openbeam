import { describe, expect, it } from "bun:test";
import type {
  MatterportFloor,
  MatterportMattertag,
  MatterportModel,
  MatterportRoom,
  MatterportSweep,
  MatterportTransformContext,
} from "@openplane/types/services/connectors/matterport";
import {
  type FloorTransformParams,
  transformFloor,
} from "../transformers/floor";
import {
  type MattertagTransformParams,
  transformMattertag,
  transformMattertags,
} from "../transformers/mattertag";
import { transformModel, transformModels } from "../transformers/model";
import {
  type RoomTransformParams,
  transformRoom,
  transformRooms,
} from "../transformers/room";
import {
  type SweepTransformParams,
  transformSweep,
  transformSweeps,
} from "../transformers/sweep";

const baseContext: MatterportTransformContext = {
  connectorId: "conn_mp_1",
  connectorType: "MATTERPORT",
  teamId: "team_1",
  workspaceId: "ws_1",
  apiEndpoint: "https://api.matterport.com",
};

const modelParams: FloorTransformParams &
  RoomTransformParams &
  MattertagTransformParams &
  SweepTransformParams = {
  modelId: "model_abc",
  modelName: "Office Building",
};

function createMockModel(
  overrides?: Partial<MatterportModel>
): MatterportModel {
  return {
    id: "model_abc",
    name: "Office Building",
    description: "Main headquarters office scan",
    created: "2024-01-10T08:00:00Z",
    modified: "2024-01-15T12:00:00Z",
    status: "complete",
    visibility: "private",
    address: {
      line1: "100 Main St",
      city: "San Francisco",
      state: "CA",
      country: "US",
      lat: 37.7749,
      lng: -122.4194,
    },
    summary: { rooms: 12, floors: 3, area: 5000 },
    ...overrides,
  };
}

function createMockRoom(overrides?: Partial<MatterportRoom>): MatterportRoom {
  return {
    id: "room_1",
    label: "Conference Room A",
    floorArea: 250,
    floorPosition: { x: 5, y: 0, z: 10 },
    center: { x: 5.5, y: 1.5, z: 10.5 },
    bounds: {
      min: { x: 3, y: 0, z: 8 },
      max: { x: 8, y: 3, z: 13 },
    },
    floor: { id: "floor_1", label: "Floor 1" },
    ...overrides,
  };
}

function createMockFloor(
  overrides?: Partial<MatterportFloor>
): MatterportFloor {
  return {
    id: "floor_1",
    label: "Floor 1",
    rooms: [createMockRoom()],
    ...overrides,
  };
}

function createMockMattertag(
  overrides?: Partial<MatterportMattertag>
): MatterportMattertag {
  return {
    id: "tag_1",
    label: "Fire Extinguisher",
    description: "Located near elevator",
    position: { x: 2.5, y: 1.2, z: 4.8 },
    color: "#ff0000",
    mediaType: "photo",
    mediaSrc: "https://cdn.matterport.com/photo.jpg",
    ...overrides,
  };
}

function createMockSweep(
  overrides?: Partial<MatterportSweep>
): MatterportSweep {
  return {
    id: "sweep_1",
    position: { x: 3.0, y: 1.5, z: 7.0 },
    rotation: { x: 0, y: 45, z: 0 },
    floor: { id: "floor_1", label: "Floor 1" },
    room: { id: "room_1", label: "Conference Room A" },
    neighbors: ["sweep_2", "sweep_3"],
    ...overrides,
  };
}

describe("matterport transformers", () => {
  describe("transformModel", () => {
    it("transforms model to GenericDocument", async () => {
      const doc = await transformModel(createMockModel(), baseContext);

      expect(doc.id).toBe("conn_mp_1_model_model_abc");
      expect(doc.connector_id).toBe("conn_mp_1");
      expect(doc.connector_type).toBe("MATTERPORT");
      expect(doc.team_id).toBe("team_1");
      expect(doc.workspace_id).toBe("ws_1");
      expect(doc.external_id).toBe("model_abc");
      expect(doc.document_type).toBe("spatial_model");
      expect(doc.title).toBe("Office Building");
      expect(doc.source_type).toBe("matterport");
    });

    it("builds content with description and summary", async () => {
      const doc = await transformModel(createMockModel(), baseContext);

      expect(doc.content).toContain("Main headquarters office scan");
      expect(doc.content).toContain("Status: complete");
      expect(doc.content).toContain("Visibility: private");
      expect(doc.content).toContain("Rooms: 12");
      expect(doc.content).toContain("Floors: 3");
      expect(doc.content).toContain("Area: 5000 sq ft");
    });

    it("builds content with address", async () => {
      const doc = await transformModel(createMockModel(), baseContext);
      expect(doc.content).toContain("100 Main St, San Francisco, CA, US");
    });

    it("includes spatial metadata", async () => {
      const doc = await transformModel(createMockModel(), baseContext);

      expect(doc.metadata?.modelId).toBe("model_abc");
      expect(doc.metadata?.status).toBe("complete");
      expect(doc.metadata?.rooms).toBe(12);
      expect(doc.metadata?.floors).toBe(3);
      expect(doc.metadata?.latitude).toBe(37.7749);
      expect(doc.metadata?.longitude).toBe(-122.4194);
    });

    it("builds URL with model ID", async () => {
      const doc = await transformModel(createMockModel(), baseContext);
      expect(doc.url).toBe("https://my.matterport.com/show/?m=model_abc");
    });

    it("sets is_public based on visibility", async () => {
      const publicModel = createMockModel({ visibility: "public" });
      const privateModel = createMockModel({ visibility: "private" });

      const publicDoc = await transformModel(publicModel, baseContext);
      const privateDoc = await transformModel(privateModel, baseContext);

      expect(publicDoc.is_public).toBe(true);
      expect(privateDoc.is_public).toBe(false);
    });

    it("parses timestamps correctly", async () => {
      const doc = await transformModel(createMockModel(), baseContext);

      expect(doc.created_at).toBe(new Date("2024-01-10T08:00:00Z").getTime());
      expect(doc.updated_at).toBe(new Date("2024-01-15T12:00:00Z").getTime());
    });

    it("generates deterministic checksums", async () => {
      const model = createMockModel();
      const doc1 = await transformModel(model, baseContext);
      const doc2 = await transformModel(model, baseContext);
      expect(doc1.checksum).toBe(doc2.checksum);
    });

    it("handles model without optional fields", async () => {
      const model = createMockModel({
        description: undefined,
        address: undefined,
        summary: undefined,
      });

      const doc = await transformModel(model, baseContext);
      expect(doc.title).toBe("Office Building");
      expect(doc.content).toContain("Status: complete");
      expect(doc.metadata?.latitude).toBeUndefined();
    });

    it("transforms multiple models", async () => {
      const models = [
        createMockModel({ id: "m1", name: "Building A" }),
        createMockModel({ id: "m2", name: "Building B" }),
      ];

      const docs = await transformModels(models, baseContext);
      expect(docs).toHaveLength(2);
      expect(docs[0]?.external_id).toBe("m1");
      expect(docs[1]?.external_id).toBe("m2");
    });

    it("sets access_control with team ID", async () => {
      const doc = await transformModel(createMockModel(), baseContext);
      expect(doc.access_control).toEqual(["team:team_1"]);
    });
  });

  describe("transformRoom", () => {
    it("transforms room to GenericDocument", async () => {
      const doc = await transformRoom(
        createMockRoom(),
        baseContext,
        modelParams
      );

      expect(doc.id).toBe("conn_mp_1_room_model_abc_room_1");
      expect(doc.document_type).toBe("spatial_room");
      expect(doc.title).toBe("Conference Room A");
      expect(doc.external_id).toBe("room_1");
    });

    it("sets parent_id to model document", async () => {
      const doc = await transformRoom(
        createMockRoom(),
        baseContext,
        modelParams
      );
      expect(doc.parent_id).toBe("conn_mp_1_model_model_abc");
    });

    it("builds content with spatial info", async () => {
      const doc = await transformRoom(
        createMockRoom(),
        baseContext,
        modelParams
      );

      expect(doc.content).toContain("Room in model: Office Building");
      expect(doc.content).toContain("Floor area: 250 sq ft");
      expect(doc.content).toContain("Floor: Floor 1");
      expect(doc.content).toContain("Center:");
    });

    it("includes room metadata", async () => {
      const doc = await transformRoom(
        createMockRoom(),
        baseContext,
        modelParams
      );

      expect(doc.metadata?.roomId).toBe("room_1");
      expect(doc.metadata?.modelId).toBe("model_abc");
      expect(doc.metadata?.floorArea).toBe(250);
      expect(doc.metadata?.floorId).toBe("floor_1");
      expect(doc.metadata?.floorLabel).toBe("Floor 1");
    });

    it("handles room without floor reference", async () => {
      const room = createMockRoom({ floor: undefined });
      const doc = await transformRoom(room, baseContext, modelParams);
      expect(doc.metadata?.floorId).toBeUndefined();
    });

    it("transforms multiple rooms", async () => {
      const rooms = [
        createMockRoom({ id: "r1", label: "Room A" }),
        createMockRoom({ id: "r2", label: "Room B" }),
      ];

      const docs = await transformRooms(rooms, baseContext, modelParams);
      expect(docs).toHaveLength(2);
    });

    it("generates deterministic checksums", async () => {
      const room = createMockRoom();
      const doc1 = await transformRoom(room, baseContext, modelParams);
      const doc2 = await transformRoom(room, baseContext, modelParams);
      expect(doc1.checksum).toBe(doc2.checksum);
    });
  });

  describe("transformFloor", () => {
    it("transforms floor to GenericDocument", async () => {
      const doc = await transformFloor(
        createMockFloor(),
        baseContext,
        modelParams
      );

      expect(doc.id).toBe("conn_mp_1_floor_model_abc_floor_1");
      expect(doc.document_type).toBe("spatial_floor");
      expect(doc.title).toBe("Floor 1");
    });

    it("sets parent_id to model document", async () => {
      const doc = await transformFloor(
        createMockFloor(),
        baseContext,
        modelParams
      );
      expect(doc.parent_id).toBe("conn_mp_1_model_model_abc");
    });

    it("builds content with room count and names", async () => {
      const doc = await transformFloor(
        createMockFloor(),
        baseContext,
        modelParams
      );

      expect(doc.content).toContain("Floor in model: Office Building");
      expect(doc.content).toContain("Rooms: 1");
      expect(doc.content).toContain("Conference Room A");
    });

    it("includes floor metadata with room IDs", async () => {
      const doc = await transformFloor(
        createMockFloor(),
        baseContext,
        modelParams
      );

      expect(doc.metadata?.floorId).toBe("floor_1");
      expect(doc.metadata?.roomCount).toBe(1);
      expect(doc.metadata?.roomIds).toEqual(["room_1"]);
    });

    it("handles floor with no rooms", async () => {
      const floor = createMockFloor({ rooms: [] });
      const doc = await transformFloor(floor, baseContext, modelParams);
      expect(doc.metadata?.roomCount).toBe(0);
      expect(doc.content).not.toContain("Room names:");
    });
  });

  describe("transformMattertag", () => {
    it("transforms mattertag to GenericDocument", async () => {
      const doc = await transformMattertag(
        createMockMattertag(),
        baseContext,
        modelParams
      );

      expect(doc.id).toBe("conn_mp_1_mattertag_model_abc_tag_1");
      expect(doc.document_type).toBe("spatial_annotation");
      expect(doc.title).toBe("Fire Extinguisher");
    });

    it("builds content with position and description", async () => {
      const doc = await transformMattertag(
        createMockMattertag(),
        baseContext,
        modelParams
      );

      expect(doc.content).toContain("Annotation in model: Office Building");
      expect(doc.content).toContain("Located near elevator");
      expect(doc.content).toContain("Position:");
      expect(doc.content).toContain("Media: photo");
    });

    it("includes mattertag metadata", async () => {
      const doc = await transformMattertag(
        createMockMattertag(),
        baseContext,
        modelParams
      );

      expect(doc.metadata?.mattertagId).toBe("tag_1");
      expect(doc.metadata?.color).toBe("#ff0000");
      expect(doc.metadata?.mediaType).toBe("photo");
      expect(doc.metadata?.mediaSrc).toBe(
        "https://cdn.matterport.com/photo.jpg"
      );
    });

    it("handles mattertag without optional fields", async () => {
      const tag = createMockMattertag({
        description: undefined,
        color: undefined,
        mediaType: undefined,
        mediaSrc: undefined,
      });

      const doc = await transformMattertag(tag, baseContext, modelParams);
      expect(doc.metadata?.color).toBeUndefined();
      expect(doc.metadata?.mediaType).toBeUndefined();
    });

    it("transforms multiple mattertags", async () => {
      const tags = [
        createMockMattertag({ id: "t1", label: "Tag A" }),
        createMockMattertag({ id: "t2", label: "Tag B" }),
      ];

      const docs = await transformMattertags(tags, baseContext, modelParams);
      expect(docs).toHaveLength(2);
    });
  });

  describe("transformSweep", () => {
    it("transforms sweep to GenericDocument", async () => {
      const doc = await transformSweep(
        createMockSweep(),
        baseContext,
        modelParams
      );

      expect(doc.id).toBe("conn_mp_1_sweep_model_abc_sweep_1");
      expect(doc.document_type).toBe("spatial_sweep");
      expect(doc.title).toBe("Sweep sweep_1");
    });

    it("builds content with spatial info", async () => {
      const doc = await transformSweep(
        createMockSweep(),
        baseContext,
        modelParams
      );

      expect(doc.content).toContain("Sweep point in model: Office Building");
      expect(doc.content).toContain("Position:");
      expect(doc.content).toContain("Floor: Floor 1");
      expect(doc.content).toContain("Room: Conference Room A");
      expect(doc.content).toContain("Neighbors: 2");
    });

    it("includes sweep metadata with position and rotation", async () => {
      const doc = await transformSweep(
        createMockSweep(),
        baseContext,
        modelParams
      );

      expect(doc.metadata?.sweepId).toBe("sweep_1");
      expect(doc.metadata?.positionX).toBe(3.0);
      expect(doc.metadata?.positionY).toBe(1.5);
      expect(doc.metadata?.positionZ).toBe(7.0);
      expect(doc.metadata?.rotationX).toBe(0);
      expect(doc.metadata?.rotationY).toBe(45);
      expect(doc.metadata?.neighborCount).toBe(2);
    });

    it("includes floor and room references in metadata", async () => {
      const doc = await transformSweep(
        createMockSweep(),
        baseContext,
        modelParams
      );

      expect(doc.metadata?.floorId).toBe("floor_1");
      expect(doc.metadata?.floorLabel).toBe("Floor 1");
      expect(doc.metadata?.roomId).toBe("room_1");
      expect(doc.metadata?.roomLabel).toBe("Conference Room A");
    });

    it("handles sweep without floor or room", async () => {
      const sweep = createMockSweep({
        floor: undefined,
        room: undefined,
        neighbors: [],
      });

      const doc = await transformSweep(sweep, baseContext, modelParams);
      expect(doc.metadata?.floorId).toBeUndefined();
      expect(doc.metadata?.roomId).toBeUndefined();
      expect(doc.metadata?.neighborCount).toBe(0);
    });

    it("transforms multiple sweeps", async () => {
      const sweeps = [
        createMockSweep({ id: "s1" }),
        createMockSweep({ id: "s2" }),
      ];

      const docs = await transformSweeps(sweeps, baseContext, modelParams);
      expect(docs).toHaveLength(2);
    });

    it("generates deterministic checksums", async () => {
      const sweep = createMockSweep();
      const doc1 = await transformSweep(sweep, baseContext, modelParams);
      const doc2 = await transformSweep(sweep, baseContext, modelParams);
      expect(doc1.checksum).toBe(doc2.checksum);
    });
  });
});
