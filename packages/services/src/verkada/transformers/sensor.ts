import type { VerkadaTransformContext } from "@openplane/types/services/connectors/verkada";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface VerkadaSensor {
  device_id: string;
  device_name: string;
  device_serial?: string;
  site?: string;
  site_id?: string;
  temperature?: number;
  humidity?: number;
  noise_level?: number;
  tvoc?: number;
  motion?: number;
  time?: number;
}

function buildSensorContent(sensor: VerkadaSensor): string {
  const parts: string[] = [];

  if (sensor.site) {
    parts.push(`Site: ${sensor.site}`);
  }
  if (sensor.device_serial) {
    parts.push(`Serial: ${sensor.device_serial}`);
  }
  if (sensor.temperature != null) {
    parts.push(`Temperature: ${sensor.temperature.toFixed(1)}°C`);
  }
  if (sensor.humidity != null) {
    parts.push(`Humidity: ${sensor.humidity.toFixed(1)}%`);
  }
  if (sensor.noise_level != null) {
    parts.push(`Noise: ${sensor.noise_level.toFixed(1)} dB`);
  }
  if (sensor.tvoc != null) {
    parts.push(`TVOC: ${sensor.tvoc} ppb`);
  }

  return parts.join("\n");
}

function buildSensorMetadata(
  sensor: VerkadaSensor
): GenericDocument["metadata"] {
  return {
    deviceId: sensor.device_id,
    ...(sensor.device_serial && { serial: sensor.device_serial }),
    ...(sensor.site && { site: sensor.site }),
    ...(sensor.site_id && { siteId: sensor.site_id }),
    ...(sensor.temperature != null && { temperature: sensor.temperature }),
    ...(sensor.humidity != null && { humidity: sensor.humidity }),
    ...(sensor.noise_level != null && { noiseLevel: sensor.noise_level }),
    ...(sensor.tvoc != null && { tvoc: sensor.tvoc }),
    ...(sensor.motion != null && { motion: sensor.motion }),
  };
}

export async function transformSensor(
  sensor: VerkadaSensor,
  context: VerkadaTransformContext
): Promise<GenericDocument> {
  const title = sensor.device_name;
  const content = buildSensorContent(sensor);
  const metadata = buildSensorMetadata(sensor);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();
  const updatedAt = sensor.time ? sensor.time * 1000 : now;

  return {
    id: `${context.connectorId}_sensor_${sensor.device_id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: sensor.device_id,
    document_type: "device",
    document_subtype: "sensor",
    title,
    content,
    created_at: updatedAt,
    updated_at: updatedAt,
    source_type: "verkada",
    source_name: context.organizationName,
    url: `https://command.verkada.com/environment/${sensor.device_id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformSensors(
  sensors: VerkadaSensor[],
  context: VerkadaTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(sensors.map((sensor) => transformSensor(sensor, context)));
}
