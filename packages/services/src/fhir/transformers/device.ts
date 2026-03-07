import type {
  FhirDevice,
  FhirTransformContext,
} from "@openbeam/types/services/connectors/fhir";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { buildAccessControl } from "../phi/consent";

function getDeviceName(device: FhirDevice): string {
  if (device.deviceName?.length) {
    return device.deviceName[0]?.name ?? `Device ${device.id}`;
  }
  return (
    device.type?.text ??
    device.type?.coding?.[0]?.display ??
    `Device ${device.id}`
  );
}

function buildDeviceContent(device: FhirDevice): string {
  const parts: string[] = [];

  parts.push(`Device: ${getDeviceName(device)}`);

  if (device.status) {
    parts.push(`Status: ${device.status}`);
  }

  if (device.manufacturer) {
    parts.push(`Manufacturer: ${device.manufacturer}`);
  }

  if (device.modelNumber) {
    parts.push(`Model: ${device.modelNumber}`);
  }

  const typeName = device.type?.text ?? device.type?.coding?.[0]?.display;
  if (typeName) {
    parts.push(`Type: ${typeName}`);
  }

  if (device.location?.display) {
    parts.push(`Location: ${device.location.display}`);
  }

  if (device.owner?.display) {
    parts.push(`Owner: ${device.owner.display}`);
  }

  return parts.join("\n");
}

function buildDeviceMetadata(device: FhirDevice): GenericDocument["metadata"] {
  const deviceTypeDisplay =
    device.type?.text ?? device.type?.coding?.[0]?.display;
  return {
    resourceType: "Device",
    fhirId: device.id,
    ...(device.status != null && { status: device.status }),
    ...(device.manufacturer != null && { manufacturer: device.manufacturer }),
    ...(device.modelNumber != null && { modelNumber: device.modelNumber }),
    ...(device.type?.coding?.[0]?.code != null && {
      deviceType: device.type.coding[0].code,
    }),
    ...(deviceTypeDisplay != null && { deviceTypeDisplay }),
  };
}

export async function transformDevice(
  device: FhirDevice,
  context: FhirTransformContext
): Promise<GenericDocument> {
  const title = getDeviceName(device);
  const content = buildDeviceContent(device);
  const metadata = buildDeviceMetadata(device);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_device_${device.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: device.id,
    document_type: "healthcare_device",
    title,
    content,
    created_at: device.meta?.lastUpdated
      ? new Date(device.meta.lastUpdated).getTime()
      : Date.now(),
    updated_at: device.meta?.lastUpdated
      ? new Date(device.meta.lastUpdated).getTime()
      : Date.now(),
    source_type: "fhir",
    url: `${context.fhirBaseUrl}/Device/${device.id}`,
    is_public: false,
    access_control: buildAccessControl(context.teamId),
    metadata,
    checksum,
  };
}
