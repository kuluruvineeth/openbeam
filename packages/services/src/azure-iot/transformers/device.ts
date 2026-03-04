import type { AzureIotTransformContext } from "@openplane/types/services/connectors/azure-iot";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { AzureIotTwin } from "../client";

function buildDeviceContent(twin: AzureIotTwin): string {
  const parts: string[] = [];

  parts.push(`Status: ${twin.status}`);
  parts.push(`Connection: ${twin.connectionState}`);

  if (twin.capabilities?.iotEdge) {
    parts.push("Type: Edge Device");
  }

  if (twin.authenticationType) {
    parts.push(`Auth: ${twin.authenticationType}`);
  }

  const tags = flattenObject(twin.tags);
  if (tags.length > 0) {
    parts.push(`Tags: ${tags.join(", ")}`);
  }

  const reported = flattenObject(twin.properties.reported, [
    "$metadata",
    "$version",
  ]);
  if (reported.length > 0) {
    parts.push(`Reported: ${reported.join(", ")}`);
  }

  const desired = flattenObject(twin.properties.desired, [
    "$metadata",
    "$version",
  ]);
  if (desired.length > 0) {
    parts.push(`Desired: ${desired.join(", ")}`);
  }

  return parts.join("\n");
}

function flattenObject(
  obj: Record<string, unknown>,
  excludeKeys: string[] = []
): string[] {
  const result: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (excludeKeys.includes(key)) {
      continue;
    }
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const nested = flattenObject(
        value as Record<string, unknown>,
        excludeKeys
      );
      for (const item of nested) {
        result.push(`${key}.${item}`);
      }
    } else {
      result.push(`${key}: ${value}`);
    }
  }
  return result;
}

function serializeForMetadata(
  obj: Record<string, unknown>,
  excludeKeys: string[] = []
): string {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!excludeKeys.includes(key)) {
      filtered[key] = value;
    }
  }
  return JSON.stringify(filtered);
}

function buildDeviceMetadata(twin: AzureIotTwin): GenericDocument["metadata"] {
  const systemExclude = ["$metadata", "$version"];
  return {
    deviceId: twin.deviceId,
    status: twin.status,
    connectionState: twin.connectionState,
    version: twin.version,
    ...(twin.authenticationType && { authType: twin.authenticationType }),
    ...(twin.capabilities?.iotEdge != null && {
      isEdgeDevice: twin.capabilities.iotEdge,
    }),
    ...(twin.deviceScope && { deviceScope: twin.deviceScope }),
    ...(Object.keys(twin.tags).length > 0 && {
      tags: serializeForMetadata(twin.tags),
    }),
    ...(Object.keys(twin.properties.reported).filter(
      (k) => !systemExclude.includes(k)
    ).length > 0 && {
      reportedProperties: serializeForMetadata(
        twin.properties.reported,
        systemExclude
      ),
    }),
    ...(Object.keys(twin.properties.desired).filter(
      (k) => !systemExclude.includes(k)
    ).length > 0 && {
      desiredProperties: serializeForMetadata(
        twin.properties.desired,
        systemExclude
      ),
    }),
    ...(twin.cloudToDeviceMessageCount > 0 && {
      c2dMessageCount: twin.cloudToDeviceMessageCount,
    }),
  };
}

export async function transformDevice(
  twin: AzureIotTwin,
  context: AzureIotTransformContext
): Promise<GenericDocument> {
  const title = twin.deviceId;
  const content = buildDeviceContent(twin);
  const metadata = buildDeviceMetadata(twin);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const lastActivity = new Date(twin.lastActivityTime).getTime();
  const updatedAt = Number.isNaN(lastActivity) ? Date.now() : lastActivity;

  const consoleUrl = `https://portal.azure.com/#view/Microsoft_Azure_IotHub/DeviceDetailBlade/deviceId/${encodeURIComponent(twin.deviceId)}`;

  return {
    id: `${context.connectorId}_device_${twin.deviceId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: twin.deviceId,
    document_type: "device",
    document_subtype: "iot_device",
    title,
    content,
    created_at: updatedAt,
    updated_at: updatedAt,
    source_type: "azure-iot",
    source_name: context.hubName,
    url: consoleUrl,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformDevices(
  twins: AzureIotTwin[],
  context: AzureIotTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(twins.map((twin) => transformDevice(twin, context)));
}
