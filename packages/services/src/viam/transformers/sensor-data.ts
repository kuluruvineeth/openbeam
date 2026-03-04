import type {
  ViamAggregatedReading,
  ViamTransformContext,
} from "@openplane/types/services/connectors/viam";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildSensorDataContent(reading: ViamAggregatedReading): string {
  const parts: string[] = [];

  parts.push(`Component: ${reading.componentName}`);
  parts.push(`Samples: ${reading.count}`);
  parts.push(
    `Time window: ${new Date(reading.startTime).toISOString()} — ${new Date(reading.endTime).toISOString()}`
  );

  for (const [key, stats] of Object.entries(reading.values)) {
    parts.push(
      `${key}: min=${stats.min}, max=${stats.max}, avg=${stats.avg.toFixed(2)}`
    );
  }

  return parts.join("\n");
}

function buildSensorDataMetadata(
  reading: ViamAggregatedReading
): GenericDocument["metadata"] {
  return {
    componentName: reading.componentName,
    machineId: reading.machineId,
    sampleCount: reading.count,
    startTime: reading.startTime,
    endTime: reading.endTime,
    measurementKeys: Object.keys(reading.values),
  };
}

export async function transformSensorData(
  reading: ViamAggregatedReading,
  context: ViamTransformContext
): Promise<GenericDocument> {
  const title = `${reading.componentName} readings`;
  const content = buildSensorDataContent(reading);
  const metadata = buildSensorDataMetadata(reading);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_sensor_${reading.machineId}_${reading.componentName}_${reading.startTime}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: `${reading.machineId}:${reading.componentName}:${reading.startTime}`,
    document_type: "robot_sensor_data",
    title,
    content,
    created_at: reading.startTime,
    updated_at: reading.endTime,
    source_type: "viam",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformSensorDataBatch(
  readings: ViamAggregatedReading[],
  context: ViamTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(readings.map((r) => transformSensorData(r, context)));
}
