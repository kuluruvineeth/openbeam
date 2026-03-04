import { describe, expect, it } from "bun:test";
import type { VerkadaTransformContext } from "@openplane/types/services/connectors/verkada";
import type { VerkadaCamera } from "../transformers/camera";
import { transformCamera, transformCameras } from "../transformers/camera";
import type { VerkadaDoor } from "../transformers/door";
import { transformDoor, transformDoors } from "../transformers/door";
import type { VerkadaSensor } from "../transformers/sensor";
import { transformSensor, transformSensors } from "../transformers/sensor";

const baseContext: VerkadaTransformContext = {
  connectorId: "conn_verkada_1",
  connectorType: "VERKADA",
  teamId: "team_1",
  workspaceId: "ws_1",
  organizationId: "org_1",
  organizationName: "Acme Security",
  region: "us",
};

function createMockCamera(overrides?: Partial<VerkadaCamera>): VerkadaCamera {
  return {
    camera_id: "cam_100",
    name: "Lobby Camera",
    model: "CD41",
    serial: "CB2N-GxCK-FM5P",
    mac: "A6:3C:C7:EC:10:03",
    status: "Live",
    site: "HQ Building",
    site_id: "site_1",
    location: "San Francisco, CA",
    location_lat: 37.7749,
    location_lon: -122.4194,
    firmware: "Up to date",
    date_added: 1_590_699_308,
    last_online: 1_590_899_308,
    device_retention: 30,
    cloud_retention: 365,
    timezone: "America/Los_Angeles",
    people_history_enabled: true,
    vehicle_history_enabled: false,
    ...overrides,
  };
}

function createMockDoor(overrides?: Partial<VerkadaDoor>): VerkadaDoor {
  return {
    door_id: "door_200",
    name: "Main Entrance",
    site: "HQ Building",
    site_id: "site_1",
    acu_id: "acu_1",
    acu_name: "Front ACU",
    lock_status: "Locked",
    door_status: "Closed",
    ...overrides,
  };
}

function createMockSensor(overrides?: Partial<VerkadaSensor>): VerkadaSensor {
  return {
    device_id: "sensor_300",
    device_name: "Server Room Sensor",
    device_serial: "JQ9R-R9CG-RF6X",
    site: "HQ Building",
    site_id: "site_1",
    temperature: 22.5,
    humidity: 45.0,
    noise_level: 35.2,
    tvoc: 120,
    motion: 0,
    time: 1_639_592_320,
    ...overrides,
  };
}

describe("verkada transformers", () => {
  describe("transformCamera", () => {
    it("transforms camera to GenericDocument", async () => {
      const camera = createMockCamera();
      const doc = await transformCamera(camera, baseContext);

      expect(doc.id).toBe("conn_verkada_1_camera_cam_100");
      expect(doc.connector_id).toBe("conn_verkada_1");
      expect(doc.connector_type).toBe("VERKADA");
      expect(doc.team_id).toBe("team_1");
      expect(doc.workspace_id).toBe("ws_1");
      expect(doc.external_id).toBe("cam_100");
      expect(doc.document_type).toBe("device");
      expect(doc.document_subtype).toBe("camera");
      expect(doc.title).toBe("Lobby Camera");
      expect(doc.is_public).toBe(false);
      expect(doc.source_type).toBe("verkada");
      expect(doc.source_name).toBe("Acme Security");
    });

    it("builds camera content with details", async () => {
      const doc = await transformCamera(createMockCamera(), baseContext);

      expect(doc.content).toContain("Model: CD41");
      expect(doc.content).toContain("Serial: CB2N-GxCK-FM5P");
      expect(doc.content).toContain("Status: Live");
      expect(doc.content).toContain("Site: HQ Building");
      expect(doc.content).toContain("Location: San Francisco, CA");
      expect(doc.content).toContain("Firmware: Up to date");
    });

    it("includes GPS metadata", async () => {
      const doc = await transformCamera(createMockCamera(), baseContext);

      expect(doc.metadata?.latitude).toBe(37.7749);
      expect(doc.metadata?.longitude).toBe(-122.4194);
    });

    it("includes retention metadata", async () => {
      const doc = await transformCamera(createMockCamera(), baseContext);

      expect(doc.metadata?.deviceRetentionDays).toBe(30);
      expect(doc.metadata?.cloudRetentionDays).toBe(365);
    });

    it("generates deterministic checksums", async () => {
      const camera = createMockCamera();
      const doc1 = await transformCamera(camera, baseContext);
      const doc2 = await transformCamera(camera, baseContext);

      expect(doc1.checksum).toBe(doc2.checksum);
    });

    it("builds URL with camera ID", async () => {
      const doc = await transformCamera(createMockCamera(), baseContext);

      expect(doc.url).toBe("https://command.verkada.com/cameras/cam_100");
    });

    it("handles minimal camera without optional fields", async () => {
      const camera = createMockCamera({
        model: undefined,
        serial: undefined,
        status: undefined,
        site: undefined,
        location: undefined,
        location_lat: undefined,
        location_lon: undefined,
        firmware: undefined,
      });

      const doc = await transformCamera(camera, baseContext);

      expect(doc.title).toBe("Lobby Camera");
      expect(doc.document_type).toBe("device");
    });

    it("transforms multiple cameras", async () => {
      const cameras = [
        createMockCamera({ camera_id: "c1", name: "Camera 1" }),
        createMockCamera({ camera_id: "c2", name: "Camera 2" }),
      ];

      const docs = await transformCameras(cameras, baseContext);
      expect(docs).toHaveLength(2);
      expect(docs[0]?.external_id).toBe("c1");
      expect(docs[1]?.external_id).toBe("c2");
    });
  });

  describe("transformDoor", () => {
    it("transforms door to GenericDocument", async () => {
      const door = createMockDoor();
      const doc = await transformDoor(door, baseContext);

      expect(doc.id).toBe("conn_verkada_1_door_door_200");
      expect(doc.external_id).toBe("door_200");
      expect(doc.document_type).toBe("device");
      expect(doc.document_subtype).toBe("door");
      expect(doc.title).toBe("Main Entrance");
    });

    it("builds door content with details", async () => {
      const doc = await transformDoor(createMockDoor(), baseContext);

      expect(doc.content).toContain("Site: HQ Building");
      expect(doc.content).toContain("ACU: Front ACU");
      expect(doc.content).toContain("Lock: Locked");
      expect(doc.content).toContain("Door: Closed");
    });

    it("includes door metadata", async () => {
      const doc = await transformDoor(createMockDoor(), baseContext);

      expect(doc.metadata?.doorId).toBe("door_200");
      expect(doc.metadata?.site).toBe("HQ Building");
      expect(doc.metadata?.lockStatus).toBe("Locked");
      expect(doc.metadata?.doorStatus).toBe("Closed");
    });

    it("transforms multiple doors", async () => {
      const doors = [
        createMockDoor({ door_id: "d1", name: "Door A" }),
        createMockDoor({ door_id: "d2", name: "Door B" }),
      ];

      const docs = await transformDoors(doors, baseContext);
      expect(docs).toHaveLength(2);
    });
  });

  describe("transformSensor", () => {
    it("transforms sensor to GenericDocument", async () => {
      const sensor = createMockSensor();
      const doc = await transformSensor(sensor, baseContext);

      expect(doc.id).toBe("conn_verkada_1_sensor_sensor_300");
      expect(doc.external_id).toBe("sensor_300");
      expect(doc.document_type).toBe("device");
      expect(doc.document_subtype).toBe("sensor");
      expect(doc.title).toBe("Server Room Sensor");
    });

    it("builds sensor content with readings", async () => {
      const doc = await transformSensor(createMockSensor(), baseContext);

      expect(doc.content).toContain("Temperature: 22.5°C");
      expect(doc.content).toContain("Humidity: 45.0%");
      expect(doc.content).toContain("Noise: 35.2 dB");
      expect(doc.content).toContain("TVOC: 120 ppb");
    });

    it("includes sensor metadata", async () => {
      const doc = await transformSensor(createMockSensor(), baseContext);

      expect(doc.metadata?.deviceId).toBe("sensor_300");
      expect(doc.metadata?.serial).toBe("JQ9R-R9CG-RF6X");
      expect(doc.metadata?.temperature).toBe(22.5);
      expect(doc.metadata?.humidity).toBe(45.0);
      expect(doc.metadata?.noiseLevel).toBe(35.2);
      expect(doc.metadata?.tvoc).toBe(120);
    });

    it("converts unix timestamp to milliseconds", async () => {
      const doc = await transformSensor(createMockSensor(), baseContext);

      expect(doc.updated_at).toBe(1_639_592_320 * 1000);
    });

    it("handles sensor without optional readings", async () => {
      const sensor = createMockSensor({
        temperature: undefined,
        humidity: undefined,
        noise_level: undefined,
        tvoc: undefined,
        motion: undefined,
      });

      const doc = await transformSensor(sensor, baseContext);
      expect(doc.title).toBe("Server Room Sensor");
      expect(doc.document_subtype).toBe("sensor");
    });

    it("transforms multiple sensors", async () => {
      const sensors = [
        createMockSensor({ device_id: "s1", device_name: "Sensor 1" }),
        createMockSensor({ device_id: "s2", device_name: "Sensor 2" }),
      ];

      const docs = await transformSensors(sensors, baseContext);
      expect(docs).toHaveLength(2);
      expect(docs[0]?.external_id).toBe("s1");
      expect(docs[1]?.external_id).toBe("s2");
    });
  });
});
