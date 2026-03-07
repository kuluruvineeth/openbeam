import type {
  ThingsboardDevice,
  ThingsboardTransformContext,
} from "@openbeam/types/services/connectors/thingsboard";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildDeviceContent(device: ThingsboardDevice): string {
  const parts: string[] = [];

  if (device.type) {
    parts.push(`Type: ${device.type}`);
  }

  if (device.label && device.label !== device.name) {
    parts.push(`Label: ${device.label}`);
  }

  if (device.createdTime) {
    parts.push(`Created: ${new Date(device.createdTime).toISOString()}`);
  }

  return parts.join("\n");
}

function buildDeviceMetadata(
  device: ThingsboardDevice
): GenericDocument["metadata"] {
  return {
    deviceId: device.id.id,
    ...(device.type && { deviceType: device.type }),
    ...(device.customerId && { customerId: device.customerId.id }),
    ...(device.deviceProfileId && {
      deviceProfileId: device.deviceProfileId.id,
    }),
    ...(device.additionalInfo?.active != null && {
      active: String(device.additionalInfo.active),
    }),
  };
}

export async function transformDevice(
  device: ThingsboardDevice,
  context: ThingsboardTransformContext
): Promise<GenericDocument> {
  const title = device.label ?? device.name;
  const content = buildDeviceContent(device);
  const metadata = buildDeviceMetadata(device);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const updatedAt = device.createdTime ?? Date.now();

  return {
    id: `${context.connectorId}_device_${device.id.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: device.id.id,
    document_type: "device",
    document_subtype: "iot_device",
    title,
    content,
    created_at: updatedAt,
    updated_at: updatedAt,
    source_type: "thingsboard",
    source_name: "ThingsBoard",
    url: `${context.baseUrl}/devices/${device.id.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformDevices(
  devices: ThingsboardDevice[],
  context: ThingsboardTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(devices.map((device) => transformDevice(device, context)));
}
