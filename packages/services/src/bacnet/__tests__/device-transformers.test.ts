import { describe, expect, it } from "bun:test";
import type {
  BacnetDevice,
  BacnetTransformContext,
} from "@openplane/types/services/connectors/bacnet";
import { transformDevice, transformDevices } from "../transformers/device";

const baseContext: BacnetTransformContext = {
  connectorId: "conn_bacnet_1",
  connectorType: "BACNET",
  teamId: "team_1",
  workspaceId: "ws_1",
  networkInterface: "eth0",
  siteName: "Factory A",
};

function createMockDevice(overrides?: Partial<BacnetDevice>): BacnetDevice {
  return {
    address: "192.168.1.100:47808",
    deviceId: 1001,
    maxApdu: 1476,
    segmentation: 3,
    vendorId: 42,
    objectName: "HVAC Controller",
    modelName: "BACnet-4000",
    firmwareRevision: "2.1.0",
    applicationSoftwareVersion: "3.0.5",
    location: "Building A, Floor 2",
    description: "Main HVAC controller for east wing",
    ...overrides,
  };
}

describe("bacnet device transformers", () => {
  describe("transformDevice", () => {
    it("generates correct ID format", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.id).toBe("conn_bacnet_1_device_1001");
    });

    it("sets external_id as String(deviceId)", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.external_id).toBe("1001");
    });

    it("uses objectName as title when present", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.title).toBe("HVAC Controller");
    });

    it("falls back to BACnet Device {deviceId} when objectName is absent", async () => {
      const doc = await transformDevice(
        createMockDevice({ objectName: undefined }),
        baseContext
      );

      expect(doc.title).toBe("BACnet Device 1001");
    });

    it("sets correct document type and subtype", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.document_type).toBe("device");
      expect(doc.document_subtype).toBe("building_controller");
    });

    it("sets source fields", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.source_type).toBe("bacnet");
      expect(doc.source_name).toBe("BACnet");
    });

    it("builds content with device fields", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.content).toContain("Name: HVAC Controller");
      expect(doc.content).toContain("Model: BACnet-4000");
      expect(doc.content).toContain("Vendor ID: 42");
      expect(doc.content).toContain("Firmware: 2.1.0");
      expect(doc.content).toContain("Location: Building A, Floor 2");
      expect(doc.content).toContain("Address: 192.168.1.100:47808");
      expect(doc.content).toContain("Device ID: 1001");
      expect(doc.content).toContain(
        "Description: Main HVAC controller for east wing"
      );
    });

    it("includes required metadata fields", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.metadata?.deviceId).toBe(1001);
      expect(doc.metadata?.address).toBe("192.168.1.100:47808");
      expect(doc.metadata?.vendorId).toBe(42);
      expect(doc.metadata?.maxApdu).toBe(1476);
      expect(doc.metadata?.segmentation).toBe(3);
    });

    it("includes optional metadata when present", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.metadata?.modelName).toBe("BACnet-4000");
      expect(doc.metadata?.firmwareRevision).toBe("2.1.0");
      expect(doc.metadata?.applicationSoftwareVersion).toBe("3.0.5");
      expect(doc.metadata?.location).toBe("Building A, Floor 2");
      expect(doc.metadata?.description).toBe(
        "Main HVAC controller for east wing"
      );
    });

    it("omits optional metadata when absent", async () => {
      const doc = await transformDevice(
        createMockDevice({
          modelName: undefined,
          firmwareRevision: undefined,
          applicationSoftwareVersion: undefined,
          location: undefined,
          description: undefined,
        }),
        baseContext
      );

      expect(doc.metadata?.modelName).toBeUndefined();
      expect(doc.metadata?.firmwareRevision).toBeUndefined();
      expect(doc.metadata?.applicationSoftwareVersion).toBeUndefined();
      expect(doc.metadata?.location).toBeUndefined();
      expect(doc.metadata?.description).toBeUndefined();
    });

    it("sets source_path from context.siteName when present", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.source_path).toBe("Factory A");
    });

    it("omits source_path when siteName is absent", async () => {
      const contextWithoutSite: BacnetTransformContext = {
        ...baseContext,
        siteName: undefined,
      };
      const doc = await transformDevice(createMockDevice(), contextWithoutSite);

      expect(doc.source_path).toBeUndefined();
    });

    it("sets access_control with team scope", async () => {
      const doc = await transformDevice(createMockDevice(), baseContext);

      expect(doc.access_control).toEqual(["team:team_1"]);
    });

    it("generates deterministic checksums", async () => {
      const device = createMockDevice();
      const doc1 = await transformDevice(device, baseContext);
      const doc2 = await transformDevice(device, baseContext);

      expect(doc1.checksum).toBe(doc2.checksum);
      expect(doc1.checksum).toBeDefined();
    });

    it("produces different checksum when content changes", async () => {
      const dev1 = createMockDevice({ objectName: "Controller A" });
      const dev2 = createMockDevice({ objectName: "Controller B" });

      const doc1 = await transformDevice(dev1, baseContext);
      const doc2 = await transformDevice(dev2, baseContext);

      expect(doc1.checksum).not.toBe(doc2.checksum);
    });
  });

  describe("transformDevices", () => {
    it("transforms multiple devices", async () => {
      const devices = [
        createMockDevice({ deviceId: 1001 }),
        createMockDevice({ deviceId: 1002 }),
      ];

      const docs = await transformDevices(devices, baseContext);

      expect(docs).toHaveLength(2);
      expect(docs[0]?.external_id).toBe("1001");
      expect(docs[1]?.external_id).toBe("1002");
    });
  });
});
