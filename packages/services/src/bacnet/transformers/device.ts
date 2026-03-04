import type {
  BacnetDevice,
  BacnetTransformContext,
} from "@openplane/types/services/connectors/bacnet";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildDeviceContent(device: BacnetDevice): string {
  const parts: string[] = [];

  if (device.objectName) {
    parts.push(`Name: ${device.objectName}`);
  }

  if (device.modelName) {
    parts.push(`Model: ${device.modelName}`);
  }

  if (device.vendorId) {
    parts.push(`Vendor ID: ${device.vendorId}`);
  }

  if (device.firmwareRevision) {
    parts.push(`Firmware: ${device.firmwareRevision}`);
  }

  if (device.location) {
    parts.push(`Location: ${device.location}`);
  }

  parts.push(`Address: ${device.address}`);
  parts.push(`Device ID: ${device.deviceId}`);

  if (device.description) {
    parts.push(`Description: ${device.description}`);
  }

  return parts.join("\n");
}

function buildDeviceMetadata(
  device: BacnetDevice
): GenericDocument["metadata"] {
  return {
    deviceId: device.deviceId,
    address: device.address,
    vendorId: device.vendorId,
    maxApdu: device.maxApdu,
    segmentation: device.segmentation,
    ...(device.modelName && { modelName: device.modelName }),
    ...(device.firmwareRevision && {
      firmwareRevision: device.firmwareRevision,
    }),
    ...(device.applicationSoftwareVersion && {
      applicationSoftwareVersion: device.applicationSoftwareVersion,
    }),
    ...(device.location && { location: device.location }),
    ...(device.description && { description: device.description }),
  };
}

export async function transformDevice(
  device: BacnetDevice,
  context: BacnetTransformContext
): Promise<GenericDocument> {
  const title = device.objectName ?? `BACnet Device ${device.deviceId}`;
  const content = buildDeviceContent(device);
  const metadata = buildDeviceMetadata(device);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();

  return {
    id: `${context.connectorId}_device_${device.deviceId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(device.deviceId),
    document_type: "device",
    document_subtype: "building_controller",
    title,
    content,
    created_at: now,
    updated_at: now,
    source_type: "bacnet",
    source_name: "BACnet",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    ...(context.siteName && { source_path: context.siteName }),
  };
}

export function transformDevices(
  devices: BacnetDevice[],
  context: BacnetTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(devices.map((d) => transformDevice(d, context)));
}
