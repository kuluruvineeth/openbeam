import type { MqttTransformContext } from "@openplane/types/services/connectors/mqtt";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

interface MqttMessageInput {
  topic: string;
  payload: Record<string, unknown>;
  timestamp: number;
  qos: number;
  retain: boolean;
}

function buildMessageContent(message: MqttMessageInput): string {
  const parts: string[] = [`Topic: ${message.topic}`];

  const payloadStr = JSON.stringify(message.payload, null, 2);
  if (payloadStr.length <= 2000) {
    parts.push(`Payload: ${payloadStr}`);
  } else {
    parts.push(`Payload: ${payloadStr.slice(0, 2000)}...`);
  }

  parts.push(`QoS: ${message.qos}`);

  if (message.retain) {
    parts.push("Retained: true");
  }

  return parts.join("\n");
}

function buildMessageMetadata(
  message: MqttMessageInput
): GenericDocument["metadata"] {
  const topicParts = message.topic.split("/");

  return {
    topic: message.topic,
    topicDepth: topicParts.length,
    qos: message.qos,
    retain: message.retain,
    payloadKeys: Object.keys(message.payload).join(","),
    messageTimestamp: message.timestamp,
  };
}

export async function transformMessage(
  message: MqttMessageInput,
  context: MqttTransformContext
): Promise<GenericDocument> {
  const topicParts = message.topic.split("/");
  const shortTopic = topicParts.at(-1) ?? message.topic;
  const title = `MQTT: ${shortTopic}`;
  const content = buildMessageContent(message);
  const metadata = buildMessageMetadata(message);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_mqtt_${message.topic}_${message.timestamp}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: `${message.topic}:${message.timestamp}`,
    document_type: "sensor_reading",
    document_subtype: "mqtt_message",
    title,
    content,
    created_at: message.timestamp,
    updated_at: message.timestamp,
    source_type: "mqtt",
    source_name: context.brokerUrl,
    url: `mqtt://${context.brokerUrl}/${message.topic}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformMessages(
  messages: MqttMessageInput[],
  context: MqttTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(messages.map((m) => transformMessage(m, context)));
}
