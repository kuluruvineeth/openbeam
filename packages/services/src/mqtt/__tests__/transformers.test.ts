import { describe, expect, it } from "bun:test";
import type { MqttTransformContext } from "@openplane/types/services/connectors/mqtt";
import { transformMessage, transformMessages } from "../transformers/message";

interface MqttMessageInput {
  topic: string;
  payload: Record<string, unknown>;
  timestamp: number;
  qos: number;
  retain: boolean;
}

const baseContext: MqttTransformContext = {
  connectorId: "conn_mqtt_1",
  connectorType: "MQTT",
  teamId: "team_1",
  workspaceId: "ws_1",
  brokerUrl: "broker.example.com",
};

function createMockMessage(
  overrides?: Partial<MqttMessageInput>
): MqttMessageInput {
  return {
    topic: "factory/line1/temperature",
    payload: { value: 72.5, unit: "fahrenheit" },
    timestamp: 1_705_312_200_000,
    qos: 1,
    retain: false,
    ...overrides,
  };
}

describe("mqtt transformers", () => {
  describe("transformMessage", () => {
    it("generates correct ID format", async () => {
      const message = createMockMessage();
      const doc = await transformMessage(message, baseContext);

      expect(doc.id).toBe(
        "conn_mqtt_1_mqtt_factory/line1/temperature_1705312200000"
      );
    });

    it("sets title to MQTT: {lastSegment}", async () => {
      const doc = await transformMessage(createMockMessage(), baseContext);

      expect(doc.title).toBe("MQTT: temperature");
    });

    it("uses full topic as title when no segments", async () => {
      const doc = await transformMessage(
        createMockMessage({ topic: "temperature" }),
        baseContext
      );

      expect(doc.title).toBe("MQTT: temperature");
    });

    it("builds content with Topic, Payload, and QoS lines", async () => {
      const doc = await transformMessage(createMockMessage(), baseContext);

      expect(doc.content).toContain("Topic: factory/line1/temperature");
      expect(doc.content).toContain("Payload:");
      expect(doc.content).toContain("QoS: 1");
    });

    it("shows retain only when true", async () => {
      const nonRetained = await transformMessage(
        createMockMessage({ retain: false }),
        baseContext
      );
      expect(nonRetained.content).not.toContain("Retained");

      const retained = await transformMessage(
        createMockMessage({ retain: true }),
        baseContext
      );
      expect(retained.content).toContain("Retained: true");
    });

    it("includes correct metadata", async () => {
      const doc = await transformMessage(createMockMessage(), baseContext);

      expect(doc.metadata?.topic).toBe("factory/line1/temperature");
      expect(doc.metadata?.topicDepth).toBe(3);
      expect(doc.metadata?.qos).toBe(1);
      expect(doc.metadata?.retain).toBe(false);
      expect(doc.metadata?.payloadKeys).toBe("value,unit");
      expect(doc.metadata?.messageTimestamp).toBe(1_705_312_200_000);
    });

    it("builds URL with brokerUrl and topic", async () => {
      const doc = await transformMessage(createMockMessage(), baseContext);

      expect(doc.url).toBe(
        "mqtt://broker.example.com/factory/line1/temperature"
      );
    });

    it("sets access_control with team scope", async () => {
      const doc = await transformMessage(createMockMessage(), baseContext);

      expect(doc.access_control).toEqual(["team:team_1"]);
    });

    it("sets core document fields", async () => {
      const doc = await transformMessage(createMockMessage(), baseContext);

      expect(doc.connector_id).toBe("conn_mqtt_1");
      expect(doc.connector_type).toBe("MQTT");
      expect(doc.team_id).toBe("team_1");
      expect(doc.workspace_id).toBe("ws_1");
      expect(doc.document_type).toBe("sensor_reading");
      expect(doc.document_subtype).toBe("mqtt_message");
      expect(doc.source_type).toBe("mqtt");
      expect(doc.source_name).toBe("broker.example.com");
      expect(doc.is_public).toBe(false);
    });

    it("generates deterministic checksums", async () => {
      const message = createMockMessage();
      const doc1 = await transformMessage(message, baseContext);
      const doc2 = await transformMessage(message, baseContext);

      expect(doc1.checksum).toBe(doc2.checksum);
      expect(doc1.checksum).toBeDefined();
    });

    it("produces different checksum when content changes", async () => {
      const msg1 = createMockMessage({ payload: { value: 72 } });
      const msg2 = createMockMessage({ payload: { value: 99 } });

      const doc1 = await transformMessage(msg1, baseContext);
      const doc2 = await transformMessage(msg2, baseContext);

      expect(doc1.checksum).not.toBe(doc2.checksum);
    });

    it("truncates large payloads at 2000 chars", async () => {
      const largePayload: Record<string, unknown> = {};
      for (let i = 0; i < 200; i++) {
        largePayload[`key_${i}_with_long_name`] =
          `value_${i}_${"x".repeat(20)}`;
      }

      const doc = await transformMessage(
        createMockMessage({ payload: largePayload }),
        baseContext
      );

      expect(doc.content).toContain("...");
    });
  });

  describe("transformMessages", () => {
    it("transforms multiple messages", async () => {
      const messages = [
        createMockMessage({ topic: "sensor/temp", timestamp: 1000 }),
        createMockMessage({ topic: "sensor/humidity", timestamp: 2000 }),
      ];

      const docs = await transformMessages(messages, baseContext);

      expect(docs).toHaveLength(2);
      expect(docs[0]?.title).toBe("MQTT: temp");
      expect(docs[1]?.title).toBe("MQTT: humidity");
    });
  });
});
