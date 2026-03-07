import { describe, expect, it } from "bun:test";
import type {
  BacnetObject,
  BacnetTransformContext,
} from "@openbeam/types/services/connectors/bacnet";
import { BacnetObjectType } from "@openbeam/types/services/connectors/bacnet";
import { transformObject, transformObjects } from "../transformers/object";

const baseContext: BacnetTransformContext = {
  connectorId: "conn_bacnet_1",
  connectorType: "BACNET",
  teamId: "team_1",
  workspaceId: "ws_1",
  networkInterface: "eth0",
  siteName: "Factory A",
};

function createMockObject(overrides?: Partial<BacnetObject>): BacnetObject {
  return {
    type: BacnetObjectType.ANALOG_INPUT,
    instance: 1,
    objectName: "Zone Temperature",
    description: "Zone 1 temperature sensor",
    presentValue: 72.5,
    units: 62,
    statusFlags: 0,
    covIncrement: 0.5,
    ...overrides,
  };
}

describe("bacnet object transformers", () => {
  describe("transformObject", () => {
    it("generates correct ID format", async () => {
      const doc = await transformObject({
        object: createMockObject(),
        deviceId: 1001,
        context: baseContext,
      });

      expect(doc.id).toBe("conn_bacnet_1_object_1001_0_1");
    });

    it("sets external_id as deviceId_type_instance", async () => {
      const doc = await transformObject({
        object: createMockObject(),
        deviceId: 1001,
        context: baseContext,
      });

      expect(doc.external_id).toBe("1001_0_1");
    });

    it("uses objectName as title when present", async () => {
      const doc = await transformObject({
        object: createMockObject(),
        deviceId: 1001,
        context: baseContext,
      });

      expect(doc.title).toBe("Zone Temperature");
    });

    it("falls back to {typeName} {instance} when objectName is absent", async () => {
      const doc = await transformObject({
        object: createMockObject({ objectName: undefined }),
        deviceId: 1001,
        context: baseContext,
      });

      expect(doc.title).toBe("Analog Input 1");
    });

    it("sets document_type to sensor_reading for analog/binary/multi-state I/O types", async () => {
      const sensorTypes = [
        BacnetObjectType.ANALOG_INPUT,
        BacnetObjectType.ANALOG_OUTPUT,
        BacnetObjectType.ANALOG_VALUE,
        BacnetObjectType.BINARY_INPUT,
        BacnetObjectType.BINARY_OUTPUT,
        BacnetObjectType.BINARY_VALUE,
        BacnetObjectType.MULTI_STATE_INPUT,
        BacnetObjectType.MULTI_STATE_OUTPUT,
        BacnetObjectType.MULTI_STATE_VALUE,
      ];

      for (const type of sensorTypes) {
        const doc = await transformObject({
          object: createMockObject({ type }),
          deviceId: 1001,
          context: baseContext,
        });
        expect(doc.document_type).toBe("sensor_reading");
      }
    });

    it("sets document_type to device_config for non-sensor types", async () => {
      const configTypes = [
        BacnetObjectType.CALENDAR,
        BacnetObjectType.COMMAND,
        BacnetObjectType.DEVICE,
        BacnetObjectType.SCHEDULE,
        BacnetObjectType.EVENT_ENROLLMENT,
        BacnetObjectType.FILE,
        BacnetObjectType.GROUP,
        BacnetObjectType.LOOP,
        BacnetObjectType.NOTIFICATION_CLASS,
        BacnetObjectType.PROGRAM,
        BacnetObjectType.AVERAGING,
        BacnetObjectType.TREND_LOG,
      ];

      for (const type of configTypes) {
        const doc = await transformObject({
          object: createMockObject({ type }),
          deviceId: 1001,
          context: baseContext,
        });
        expect(doc.document_type).toBe("device_config");
      }
    });

    it("sets document_subtype as type name lowercased with underscores", async () => {
      const doc = await transformObject({
        object: createMockObject({ type: BacnetObjectType.ANALOG_INPUT }),
        deviceId: 1001,
        context: baseContext,
      });

      expect(doc.document_subtype).toBe("analog_input");
    });

    it("builds content with Name, Type, Description, Present Value, Units, and Status Flags", async () => {
      const doc = await transformObject({
        object: createMockObject(),
        deviceId: 1001,
        context: baseContext,
      });

      expect(doc.content).toContain("Name: Zone Temperature");
      expect(doc.content).toContain("Type: Analog Input");
      expect(doc.content).toContain("Description: Zone 1 temperature sensor");
      expect(doc.content).toContain("Present Value: 72.5");
      expect(doc.content).toContain("Units: 62");
      expect(doc.content).toContain("Status Flags: 0");
    });

    it("includes Active Text and Inactive Text in content for binary types", async () => {
      const doc = await transformObject({
        object: createMockObject({
          type: BacnetObjectType.BINARY_INPUT,
          activeText: "ON",
          inactiveText: "OFF",
        }),
        deviceId: 1001,
        context: baseContext,
      });

      expect(doc.content).toContain("Active Text: ON");
      expect(doc.content).toContain("Inactive Text: OFF");
    });

    it("includes State Text in content for multi-state types", async () => {
      const doc = await transformObject({
        object: createMockObject({
          type: BacnetObjectType.MULTI_STATE_INPUT,
          stateText: ["Off", "Low", "Medium", "High"],
        }),
        deviceId: 1001,
        context: baseContext,
      });

      expect(doc.content).toContain("State Text: Off, Low, Medium, High");
    });

    it("includes object metadata", async () => {
      const doc = await transformObject({
        object: createMockObject(),
        deviceId: 1001,
        context: baseContext,
      });

      expect(doc.metadata?.objectType).toBe(BacnetObjectType.ANALOG_INPUT);
      expect(doc.metadata?.objectTypeName).toBe("Analog Input");
      expect(doc.metadata?.objectInstance).toBe(1);
      expect(doc.metadata?.deviceId).toBe(1001);
      expect(doc.metadata?.presentValue).toBe("72.5");
      expect(doc.metadata?.units).toBe(62);
      expect(doc.metadata?.description).toBe("Zone 1 temperature sensor");
      expect(doc.metadata?.statusFlags).toBe(0);
      expect(doc.metadata?.covIncrement).toBe(0.5);
    });

    it("includes optional metadata for binary types", async () => {
      const doc = await transformObject({
        object: createMockObject({
          type: BacnetObjectType.BINARY_INPUT,
          activeText: "ON",
          inactiveText: "OFF",
        }),
        deviceId: 1001,
        context: baseContext,
      });

      expect(doc.metadata?.activeText).toBe("ON");
      expect(doc.metadata?.inactiveText).toBe("OFF");
    });

    it("includes optional metadata for multi-state types", async () => {
      const doc = await transformObject({
        object: createMockObject({
          type: BacnetObjectType.MULTI_STATE_INPUT,
          numberOfStates: 4,
          stateText: ["Off", "Low", "Medium", "High"],
        }),
        deviceId: 1001,
        context: baseContext,
      });

      expect(doc.metadata?.numberOfStates).toBe(4);
      expect(doc.metadata?.stateText).toBe(
        JSON.stringify(["Off", "Low", "Medium", "High"])
      );
    });

    it("sets source_path from context.siteName", async () => {
      const doc = await transformObject({
        object: createMockObject(),
        deviceId: 1001,
        context: baseContext,
      });

      expect(doc.source_path).toBe("Factory A");
    });

    it("omits source_path when siteName is absent", async () => {
      const contextWithoutSite: BacnetTransformContext = {
        ...baseContext,
        siteName: undefined,
      };
      const doc = await transformObject({
        object: createMockObject(),
        deviceId: 1001,
        context: contextWithoutSite,
      });

      expect(doc.source_path).toBeUndefined();
    });

    it("sets core document fields", async () => {
      const doc = await transformObject({
        object: createMockObject(),
        deviceId: 1001,
        context: baseContext,
      });

      expect(doc.connector_id).toBe("conn_bacnet_1");
      expect(doc.connector_type).toBe("BACNET");
      expect(doc.team_id).toBe("team_1");
      expect(doc.workspace_id).toBe("ws_1");
      expect(doc.source_type).toBe("bacnet");
      expect(doc.source_name).toBe("BACnet");
      expect(doc.is_public).toBe(false);
      expect(doc.access_control).toEqual(["team:team_1"]);
    });

    it("generates deterministic checksums", async () => {
      const params = {
        object: createMockObject(),
        deviceId: 1001,
        context: baseContext,
      };
      const doc1 = await transformObject(params);
      const doc2 = await transformObject(params);

      expect(doc1.checksum).toBe(doc2.checksum);
      expect(doc1.checksum).toBeDefined();
    });

    it("produces different checksum when content changes", async () => {
      const doc1 = await transformObject({
        object: createMockObject({ presentValue: 72.5 }),
        deviceId: 1001,
        context: baseContext,
      });
      const doc2 = await transformObject({
        object: createMockObject({ presentValue: 99.0 }),
        deviceId: 1001,
        context: baseContext,
      });

      expect(doc1.checksum).not.toBe(doc2.checksum);
    });
  });

  describe("transformObjects", () => {
    it("transforms multiple objects", async () => {
      const objects = [
        createMockObject({ instance: 1, objectName: "Temp 1" }),
        createMockObject({ instance: 2, objectName: "Temp 2" }),
      ];

      const docs = await transformObjects({
        objects,
        deviceId: 1001,
        context: baseContext,
      });

      expect(docs).toHaveLength(2);
      expect(docs[0]?.external_id).toBe("1001_0_1");
      expect(docs[1]?.external_id).toBe("1001_0_2");
    });
  });
});
