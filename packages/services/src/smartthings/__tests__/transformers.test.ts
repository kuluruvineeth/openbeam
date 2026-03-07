import { describe, expect, it } from "bun:test";
import type { SmartThingsTransformContext } from "@openbeam/types/services/connectors/smartthings";
import type {
  SmartThingsDevice,
  SmartThingsLocation,
  SmartThingsRoom,
  SmartThingsScene,
} from "../client";
import { transformDevice, transformDevices } from "../transformers/device";
import {
  transformLocation,
  transformLocations,
} from "../transformers/location";
import { transformScene, transformScenes } from "../transformers/scene";

const baseContext: SmartThingsTransformContext = {
  connectorId: "conn_smartthings_1",
  connectorType: "SMARTTHINGS",
  teamId: "team_1",
  workspaceId: "ws_1",
};

function createMockDevice(
  overrides?: Partial<SmartThingsDevice>
): SmartThingsDevice {
  return {
    deviceId: "6f5ea629-4c05-4a90-a244-cc129b0a80c3",
    name: "Kitchen Light",
    label: "Kitchen Ceiling Light",
    manufacturerName: "Samsung",
    locationId: "loc-001",
    roomId: "room-001",
    type: "ENDPOINT_APP",
    components: [
      {
        id: "main",
        label: "Main",
        capabilities: [
          { id: "switch", version: 1 },
          { id: "switchLevel", version: 1 },
          { id: "colorControl", version: 1 },
        ],
        categories: [{ name: "Light", categoryType: "manufacturer" }],
      },
    ],
    healthState: {
      state: "ONLINE",
      lastUpdatedDate: "2024-11-15T14:30:00Z",
    },
    ...overrides,
  };
}

function createMockLocation(
  overrides?: Partial<SmartThingsLocation>
): SmartThingsLocation {
  return {
    locationId: "loc-001",
    name: "Home",
    latitude: 37.7749,
    longitude: -122.4194,
    temperatureScale: "F",
    timeZoneId: "America/Los_Angeles",
    countryCode: "USA",
    locale: "en_US",
    created: "2023-06-01T10:00:00Z",
    lastModified: "2024-01-15T08:00:00Z",
    ...overrides,
  };
}

function createMockScene(
  overrides?: Partial<SmartThingsScene>
): SmartThingsScene {
  return {
    sceneId: "scene-001",
    sceneName: "Movie Night",
    sceneColor: "#FF5733",
    locationId: "loc-001",
    createdBy: "user-001",
    createdDate: "2023-08-15T14:30:00Z",
    lastUpdatedDate: "2024-01-10T09:00:00Z",
    lastExecutedDate: "2024-01-14T20:30:00Z",
    editable: true,
    ...overrides,
  };
}

describe("smartthings transformers", () => {
  describe("transformDevice", () => {
    it("transforms device to GenericDocument", async () => {
      const device = createMockDevice();
      const doc = await transformDevice(device, baseContext);

      expect(doc.id).toBe(
        "conn_smartthings_1_device_6f5ea629-4c05-4a90-a244-cc129b0a80c3"
      );
      expect(doc.connector_id).toBe("conn_smartthings_1");
      expect(doc.connector_type).toBe("SMARTTHINGS");
      expect(doc.team_id).toBe("team_1");
      expect(doc.workspace_id).toBe("ws_1");
      expect(doc.external_id).toBe("6f5ea629-4c05-4a90-a244-cc129b0a80c3");
      expect(doc.document_type).toBe("device");
      expect(doc.document_subtype).toBe("iot_device");
      expect(doc.title).toBe("Kitchen Ceiling Light");
      expect(doc.is_public).toBe(false);
      expect(doc.source_type).toBe("smartthings");
      expect(doc.source_name).toBe("SmartThings");
    });

    it("uses label as title, falls back to name", async () => {
      const withLabel = await transformDevice(createMockDevice(), baseContext);
      expect(withLabel.title).toBe("Kitchen Ceiling Light");

      const withoutLabel = await transformDevice(
        createMockDevice({ label: undefined }),
        baseContext
      );
      expect(withoutLabel.title).toBe("Kitchen Light");
    });

    it("builds content with device details", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.content).toContain("Label: Kitchen Ceiling Light");
      expect(doc.content).toContain("Type: ENDPOINT_APP");
      expect(doc.content).toContain("Manufacturer: Samsung");
      expect(doc.content).toContain("Health: ONLINE");
      expect(doc.content).toContain("Capabilities:");
      expect(doc.content).toContain("switch");
      expect(doc.content).toContain("switchLevel");
      expect(doc.content).toContain("Categories: Light");
    });

    it("includes room name when room lookup provided", async () => {
      const roomLookup = new Map<string, SmartThingsRoom>();
      roomLookup.set("loc-001:room-001", {
        roomId: "room-001",
        locationId: "loc-001",
        name: "Kitchen",
      });

      const doc = await transformDevice(
        createMockDevice(),
        baseContext,
        roomLookup
      );

      expect(doc.content).toContain("Room: Kitchen");
      expect(doc.metadata?.roomName).toBe("Kitchen");
    });

    it("includes device metadata", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.metadata?.deviceId).toBe(
        "6f5ea629-4c05-4a90-a244-cc129b0a80c3"
      );
      expect(doc.metadata?.deviceType).toBe("ENDPOINT_APP");
      expect(doc.metadata?.manufacturer).toBe("Samsung");
      expect(doc.metadata?.healthState).toBe("ONLINE");
      expect(doc.metadata?.locationId).toBe("loc-001");
      expect(doc.metadata?.roomId).toBe("room-001");
      expect(doc.metadata?.componentCount).toBe(1);
    });

    it("serializes capabilities as JSON string", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(typeof doc.metadata?.capabilities).toBe("string");
      const caps = JSON.parse(doc.metadata?.capabilities as string);
      expect(caps).toContain("switch");
      expect(caps).toContain("switchLevel");
      expect(caps).toContain("colorControl");
    });

    it("uses healthState lastUpdatedDate for timestamps", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);
      const expected = new Date("2024-11-15T14:30:00Z").getTime();

      expect(doc.updated_at).toBe(expected);
    });

    it("generates deterministic checksums", async () => {
      const device = createMockDevice();
      const doc1 = await transformDevice(device, baseContext);
      const doc2 = await transformDevice(device, baseContext);

      expect(doc1.checksum).toBe(doc2.checksum);
    });

    it("builds SmartThings URL", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.url).toContain("my.smartthings.com/devices/");
      expect(doc.url).toContain("6f5ea629-4c05-4a90-a244-cc129b0a80c3");
    });

    it("handles minimal device", async () => {
      const device = createMockDevice({
        label: undefined,
        manufacturerName: undefined,
        locationId: undefined,
        roomId: undefined,
        type: undefined,
        components: undefined,
        healthState: undefined,
      });
      const doc = await transformDevice(device, baseContext);

      expect(doc.title).toBe("Kitchen Light");
      expect(doc.document_type).toBe("device");
      expect(doc.metadata?.manufacturer).toBeUndefined();
      expect(doc.metadata?.capabilities).toBeUndefined();
      expect(doc.metadata?.healthState).toBeUndefined();
    });

    it("includes access control", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.access_control).toEqual(["team:team_1"]);
    });

    it("transforms multiple devices", async () => {
      const devices = [
        createMockDevice({ deviceId: "dev-1", name: "Light 1" }),
        createMockDevice({ deviceId: "dev-2", name: "Light 2" }),
        createMockDevice({ deviceId: "dev-3", name: "Light 3" }),
      ];

      const docs = await transformDevices(devices, baseContext);
      expect(docs).toHaveLength(3);
      expect(docs[0]?.external_id).toBe("dev-1");
      expect(docs[1]?.external_id).toBe("dev-2");
      expect(docs[2]?.external_id).toBe("dev-3");
    });

    it("handles device with multiple components", async () => {
      const device = createMockDevice({
        components: [
          {
            id: "main",
            capabilities: [
              { id: "switch", version: 1 },
              { id: "battery", version: 1 },
            ],
            categories: [{ name: "SmartLock", categoryType: "manufacturer" }],
          },
          {
            id: "secondary",
            capabilities: [{ id: "temperatureMeasurement", version: 1 }],
          },
        ],
      });
      const doc = await transformDevice(device, baseContext);

      expect(doc.metadata?.componentCount).toBe(2);
      const caps = JSON.parse(doc.metadata?.capabilities as string);
      expect(caps).toContain("switch");
      expect(caps).toContain("battery");
      expect(caps).toContain("temperatureMeasurement");
    });

    it("deduplicates capabilities across components", async () => {
      const device = createMockDevice({
        components: [
          {
            id: "main",
            capabilities: [{ id: "switch", version: 1 }],
          },
          {
            id: "secondary",
            capabilities: [{ id: "switch", version: 1 }],
          },
        ],
      });
      const doc = await transformDevice(device, baseContext);

      const caps = JSON.parse(doc.metadata?.capabilities as string);
      expect(caps).toHaveLength(1);
    });
  });

  describe("transformLocation", () => {
    it("transforms location to GenericDocument", async () => {
      const location = createMockLocation();
      const doc = await transformLocation(location, baseContext);

      expect(doc.id).toBe("conn_smartthings_1_location_loc-001");
      expect(doc.external_id).toBe("loc-001");
      expect(doc.document_type).toBe("location");
      expect(doc.document_subtype).toBe("iot_location");
      expect(doc.title).toBe("Home");
      expect(doc.source_type).toBe("smartthings");
    });

    it("builds content with location details", async () => {
      const doc = await transformLocation(createMockLocation(), baseContext);

      expect(doc.content).toContain("Country: USA");
      expect(doc.content).toContain("Timezone: America/Los_Angeles");
      expect(doc.content).toContain("Temperature Scale: F");
      expect(doc.content).toContain("Coordinates: 37.7749, -122.4194");
    });

    it("includes rooms in content and metadata", async () => {
      const rooms: SmartThingsRoom[] = [
        { roomId: "r1", locationId: "loc-001", name: "Living Room" },
        { roomId: "r2", locationId: "loc-001", name: "Kitchen" },
      ];

      const doc = await transformLocation(
        createMockLocation(),
        baseContext,
        rooms
      );

      expect(doc.content).toContain("Rooms: Living Room, Kitchen");
      expect(doc.metadata?.roomCount).toBe(2);
      const roomNames = JSON.parse(doc.metadata?.rooms as string);
      expect(roomNames).toContain("Living Room");
      expect(roomNames).toContain("Kitchen");
    });

    it("uses lastModified for updatedAt and created for createdAt", async () => {
      const doc = await transformLocation(createMockLocation(), baseContext);

      expect(doc.created_at).toBe(new Date("2023-06-01T10:00:00Z").getTime());
      expect(doc.updated_at).toBe(new Date("2024-01-15T08:00:00Z").getTime());
    });

    it("generates deterministic checksums", async () => {
      const location = createMockLocation();
      const doc1 = await transformLocation(location, baseContext);
      const doc2 = await transformLocation(location, baseContext);

      expect(doc1.checksum).toBe(doc2.checksum);
    });

    it("builds SmartThings URL", async () => {
      const doc = await transformLocation(createMockLocation(), baseContext);

      expect(doc.url).toContain("my.smartthings.com/locations/loc-001");
    });

    it("handles minimal location", async () => {
      const location = createMockLocation({
        latitude: undefined,
        longitude: undefined,
        countryCode: undefined,
        timeZoneId: undefined,
        temperatureScale: undefined,
        locale: undefined,
        created: undefined,
        lastModified: undefined,
      });
      const doc = await transformLocation(location, baseContext);

      expect(doc.title).toBe("Home");
      expect(doc.metadata?.countryCode).toBeUndefined();
    });

    it("transforms multiple locations", async () => {
      const locations = [
        createMockLocation({ locationId: "loc-1", name: "Home" }),
        createMockLocation({ locationId: "loc-2", name: "Office" }),
      ];

      const docs = await transformLocations(locations, baseContext);
      expect(docs).toHaveLength(2);
      expect(docs[0]?.external_id).toBe("loc-1");
      expect(docs[1]?.external_id).toBe("loc-2");
    });
  });

  describe("transformScene", () => {
    it("transforms scene to GenericDocument", async () => {
      const scene = createMockScene();
      const doc = await transformScene(scene, baseContext);

      expect(doc.id).toBe("conn_smartthings_1_scene_scene-001");
      expect(doc.external_id).toBe("scene-001");
      expect(doc.document_type).toBe("scene");
      expect(doc.document_subtype).toBe("automation_scene");
      expect(doc.title).toBe("Movie Night");
      expect(doc.source_type).toBe("smartthings");
    });

    it("builds content with scene details", async () => {
      const doc = await transformScene(createMockScene(), baseContext);

      expect(doc.content).toContain("Editable: true");
      expect(doc.content).toContain("Last Executed: 2024-01-14T20:30:00Z");
    });

    it("includes scene metadata", async () => {
      const doc = await transformScene(createMockScene(), baseContext);

      expect(doc.metadata?.sceneId).toBe("scene-001");
      expect(doc.metadata?.locationId).toBe("loc-001");
      expect(doc.metadata?.createdBy).toBe("user-001");
      expect(doc.metadata?.editable).toBe(true);
      expect(doc.metadata?.lastExecutedDate).toBe("2024-01-14T20:30:00Z");
    });

    it("uses lastUpdatedDate for updatedAt and createdDate for createdAt", async () => {
      const doc = await transformScene(createMockScene(), baseContext);

      expect(doc.created_at).toBe(new Date("2023-08-15T14:30:00Z").getTime());
      expect(doc.updated_at).toBe(new Date("2024-01-10T09:00:00Z").getTime());
    });

    it("generates deterministic checksums", async () => {
      const scene = createMockScene();
      const doc1 = await transformScene(scene, baseContext);
      const doc2 = await transformScene(scene, baseContext);

      expect(doc1.checksum).toBe(doc2.checksum);
    });

    it("builds SmartThings URL", async () => {
      const doc = await transformScene(createMockScene(), baseContext);

      expect(doc.url).toContain("my.smartthings.com/scenes/scene-001");
    });

    it("handles minimal scene", async () => {
      const scene = createMockScene({
        locationId: undefined,
        createdBy: undefined,
        editable: undefined,
        lastExecutedDate: undefined,
        sceneColor: undefined,
        createdDate: undefined,
        lastUpdatedDate: undefined,
      });
      const doc = await transformScene(scene, baseContext);

      expect(doc.title).toBe("Movie Night");
      expect(doc.metadata?.locationId).toBeUndefined();
      expect(doc.metadata?.editable).toBeUndefined();
    });

    it("transforms multiple scenes", async () => {
      const scenes = [
        createMockScene({ sceneId: "s1", sceneName: "Morning" }),
        createMockScene({ sceneId: "s2", sceneName: "Night" }),
        createMockScene({ sceneId: "s3", sceneName: "Away" }),
      ];

      const docs = await transformScenes(scenes, baseContext);
      expect(docs).toHaveLength(3);
      expect(docs[0]?.external_id).toBe("s1");
      expect(docs[1]?.external_id).toBe("s2");
      expect(docs[2]?.external_id).toBe("s3");
    });

    it("includes access control", async () => {
      const doc = await transformScene(createMockScene(), baseContext);

      expect(doc.access_control).toEqual(["team:team_1"]);
    });
  });
});
