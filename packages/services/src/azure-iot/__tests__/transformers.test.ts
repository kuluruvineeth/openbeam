import { describe, expect, it } from "bun:test";
import type { AzureIotTransformContext } from "@openplane/types/services/connectors/azure-iot";
import type { AzureIotTwin } from "../client";
import { transformDevice, transformDevices } from "../transformers/device";

const baseContext: AzureIotTransformContext = {
  connectorId: "conn_azure_iot_1",
  connectorType: "AZURE_IOT_HUB",
  teamId: "team_1",
  workspaceId: "ws_1",
  hubName: "test-hub",
};

function createMockTwin(overrides?: Partial<AzureIotTwin>): AzureIotTwin {
  return {
    deviceId: "sensor-floor3-01",
    etag: "AAAA==",
    deviceEtag: "BBBB==",
    version: 8,
    status: "enabled",
    statusUpdateTime: "2024-06-01T10:00:00Z",
    connectionState: "Connected",
    lastActivityTime: "2024-11-15T14:30:00Z",
    cloudToDeviceMessageCount: 2,
    authenticationType: "sas",
    capabilities: { iotEdge: false },
    tags: {
      location: { building: "HQ", floor: "3" },
      environment: "production",
    },
    properties: {
      desired: {
        reportingInterval: 30,
        $metadata: {},
        $version: 5,
      },
      reported: {
        temperature: 22.8,
        humidity: 45,
        firmware: "3.2.1",
        $metadata: {},
        $version: 12,
      },
    },
    ...overrides,
  };
}

describe("azure-iot transformers", () => {
  describe("transformDevice", () => {
    it("transforms twin to GenericDocument", async () => {
      const twin = createMockTwin();
      const doc = await transformDevice(twin, baseContext);

      expect(doc.id).toBe("conn_azure_iot_1_device_sensor-floor3-01");
      expect(doc.connector_id).toBe("conn_azure_iot_1");
      expect(doc.connector_type).toBe("AZURE_IOT_HUB");
      expect(doc.team_id).toBe("team_1");
      expect(doc.workspace_id).toBe("ws_1");
      expect(doc.external_id).toBe("sensor-floor3-01");
      expect(doc.document_type).toBe("device");
      expect(doc.document_subtype).toBe("iot_device");
      expect(doc.title).toBe("sensor-floor3-01");
      expect(doc.is_public).toBe(false);
      expect(doc.source_type).toBe("azure-iot");
      expect(doc.source_name).toBe("test-hub");
    });

    it("builds content from twin state", async () => {
      const doc = await transformDevice(createMockTwin(), baseContext);

      expect(doc.content).toContain("Status: enabled");
      expect(doc.content).toContain("Connection: Connected");
      expect(doc.content).toContain("Auth: sas");
      expect(doc.content).toContain("Tags:");
      expect(doc.content).toContain("Reported:");
      expect(doc.content).toContain("temperature: 22.8");
      expect(doc.content).toContain("Desired:");
      expect(doc.content).toContain("reportingInterval: 30");
    });

    it("excludes system metadata from content", async () => {
      const doc = await transformDevice(createMockTwin(), baseContext);

      expect(doc.content).not.toContain("$metadata");
      expect(doc.content).not.toContain("$version");
    });

    it("includes device metadata", async () => {
      const doc = await transformDevice(createMockTwin(), baseContext);

      expect(doc.metadata?.deviceId).toBe("sensor-floor3-01");
      expect(doc.metadata?.status).toBe("enabled");
      expect(doc.metadata?.connectionState).toBe("Connected");
      expect(doc.metadata?.version).toBe(8);
      expect(doc.metadata?.authType).toBe("sas");
      expect(doc.metadata?.c2dMessageCount).toBe(2);
    });

    it("serializes tags and properties as JSON strings", async () => {
      const doc = await transformDevice(createMockTwin(), baseContext);

      expect(typeof doc.metadata?.tags).toBe("string");
      expect(typeof doc.metadata?.reportedProperties).toBe("string");
      expect(typeof doc.metadata?.desiredProperties).toBe("string");

      const tags = JSON.parse(doc.metadata?.tags as string);
      expect(tags.environment).toBe("production");

      const reported = JSON.parse(doc.metadata?.reportedProperties as string);
      expect(reported.temperature).toBe(22.8);
    });

    it("uses lastActivityTime for timestamps", async () => {
      const doc = await transformDevice(createMockTwin(), baseContext);
      const expected = new Date("2024-11-15T14:30:00Z").getTime();

      expect(doc.updated_at).toBe(expected);
    });

    it("handles edge device flag", async () => {
      const twin = createMockTwin({
        capabilities: { iotEdge: true },
      });
      const doc = await transformDevice(twin, baseContext);

      expect(doc.content).toContain("Type: Edge Device");
      expect(doc.metadata?.isEdgeDevice).toBe(true);
    });

    it("generates deterministic checksums", async () => {
      const twin = createMockTwin();
      const doc1 = await transformDevice(twin, baseContext);
      const doc2 = await transformDevice(twin, baseContext);

      expect(doc1.checksum).toBe(doc2.checksum);
    });

    it("builds Azure portal URL", async () => {
      const doc = await transformDevice(createMockTwin(), baseContext);

      expect(doc.url).toContain("portal.azure.com");
      expect(doc.url).toContain("sensor-floor3-01");
    });

    it("handles minimal twin with empty tags and properties", async () => {
      const twin = createMockTwin({
        tags: {},
        properties: {
          desired: { $metadata: {}, $version: 1 },
          reported: { $metadata: {}, $version: 1 },
        },
        cloudToDeviceMessageCount: 0,
        capabilities: undefined,
        authenticationType: undefined,
      });
      const doc = await transformDevice(twin, baseContext);

      expect(doc.title).toBe("sensor-floor3-01");
      expect(doc.document_type).toBe("device");
      expect(doc.metadata?.tags).toBeUndefined();
      expect(doc.metadata?.reportedProperties).toBeUndefined();
      expect(doc.metadata?.desiredProperties).toBeUndefined();
      expect(doc.metadata?.c2dMessageCount).toBeUndefined();
    });

    it("includes access control", async () => {
      const doc = await transformDevice(createMockTwin(), baseContext);

      expect(doc.access_control).toEqual(["team:team_1"]);
    });

    it("transforms multiple devices", async () => {
      const twins = [
        createMockTwin({ deviceId: "device-1" }),
        createMockTwin({ deviceId: "device-2" }),
        createMockTwin({ deviceId: "device-3" }),
      ];

      const docs = await transformDevices(twins, baseContext);
      expect(docs).toHaveLength(3);
      expect(docs[0]?.external_id).toBe("device-1");
      expect(docs[1]?.external_id).toBe("device-2");
      expect(docs[2]?.external_id).toBe("device-3");
    });

    it("handles disabled device", async () => {
      const twin = createMockTwin({
        status: "disabled",
        statusReason: "Maintenance",
        connectionState: "Disconnected",
      });
      const doc = await transformDevice(twin, baseContext);

      expect(doc.content).toContain("Status: disabled");
      expect(doc.content).toContain("Connection: Disconnected");
      expect(doc.metadata?.status).toBe("disabled");
    });

    it("flattens nested tags in content", async () => {
      const twin = createMockTwin({
        tags: {
          location: { building: "HQ", floor: "3", room: "301" },
        },
      });
      const doc = await transformDevice(twin, baseContext);

      expect(doc.content).toContain("location.building: HQ");
      expect(doc.content).toContain("location.floor: 3");
      expect(doc.content).toContain("location.room: 301");
    });
  });
});
