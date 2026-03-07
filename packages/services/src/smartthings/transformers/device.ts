import type { SmartThingsTransformContext } from "@openbeam/types/services/connectors/smartthings";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { SmartThingsDevice, SmartThingsRoom } from "../client";

function buildDeviceContent(
  device: SmartThingsDevice,
  roomName?: string
): string {
  const parts: string[] = [];

  if (device.label && device.label !== device.name) {
    parts.push(`Label: ${device.label}`);
  }

  if (device.type) {
    parts.push(`Type: ${device.type}`);
  }

  if (device.manufacturerName) {
    parts.push(`Manufacturer: ${device.manufacturerName}`);
  }

  if (roomName) {
    parts.push(`Room: ${roomName}`);
  }

  if (device.healthState?.state) {
    parts.push(`Health: ${device.healthState.state}`);
  }

  const capabilities = extractCapabilities(device);
  if (capabilities.length > 0) {
    parts.push(`Capabilities: ${capabilities.join(", ")}`);
  }

  const categories = extractCategories(device);
  if (categories.length > 0) {
    parts.push(`Categories: ${categories.join(", ")}`);
  }

  return parts.join("\n");
}

function extractCapabilities(device: SmartThingsDevice): string[] {
  if (!device.components) {
    return [];
  }
  const seen = new Set<string>();
  for (const component of device.components) {
    for (const cap of component.capabilities) {
      seen.add(cap.id);
    }
  }
  return [...seen];
}

function extractCategories(device: SmartThingsDevice): string[] {
  if (!device.components) {
    return [];
  }
  const seen = new Set<string>();
  for (const component of device.components) {
    if (component.categories) {
      for (const cat of component.categories) {
        seen.add(cat.name);
      }
    }
  }
  return [...seen];
}

function buildDeviceMetadata(
  device: SmartThingsDevice,
  roomName?: string
): GenericDocument["metadata"] {
  const capabilities = extractCapabilities(device);
  const categories = extractCategories(device);

  return {
    deviceId: device.deviceId,
    ...(device.type && { deviceType: device.type }),
    ...(device.manufacturerName && {
      manufacturer: device.manufacturerName,
    }),
    ...(device.locationId && { locationId: device.locationId }),
    ...(device.roomId && { roomId: device.roomId }),
    ...(roomName && { roomName }),
    ...(device.healthState?.state && {
      healthState: device.healthState.state,
    }),
    ...(capabilities.length > 0 && {
      capabilities: JSON.stringify(capabilities),
    }),
    ...(categories.length > 0 && {
      categories: JSON.stringify(categories),
    }),
    ...(device.components &&
      device.components.length > 0 && {
        componentCount: device.components.length,
      }),
  };
}

export async function transformDevice(
  device: SmartThingsDevice,
  context: SmartThingsTransformContext,
  roomLookup?: Map<string, SmartThingsRoom>
): Promise<GenericDocument> {
  const roomName =
    device.roomId && device.locationId && roomLookup
      ? roomLookup.get(`${device.locationId}:${device.roomId}`)?.name
      : undefined;

  const title = device.label ?? device.name;
  const content = buildDeviceContent(device, roomName);
  const metadata = buildDeviceMetadata(device, roomName);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const updatedAt = device.healthState?.lastUpdatedDate
    ? new Date(device.healthState.lastUpdatedDate).getTime()
    : Date.now();

  return {
    id: `${context.connectorId}_device_${device.deviceId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: device.deviceId,
    document_type: "device",
    document_subtype: "iot_device",
    title,
    content,
    created_at: updatedAt,
    updated_at: updatedAt,
    source_type: "smartthings",
    source_name: "SmartThings",
    url: `https://my.smartthings.com/devices/${device.deviceId}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformDevices(
  devices: SmartThingsDevice[],
  context: SmartThingsTransformContext,
  roomLookup?: Map<string, SmartThingsRoom>
): Promise<GenericDocument[]> {
  return Promise.all(
    devices.map((d) => transformDevice(d, context, roomLookup))
  );
}
