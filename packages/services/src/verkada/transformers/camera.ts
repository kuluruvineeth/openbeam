import type { VerkadaTransformContext } from "@openbeam/types/services/connectors/verkada";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface VerkadaCamera {
  camera_id: string;
  name: string;
  model?: string;
  serial?: string;
  mac?: string;
  status?: string;
  site?: string;
  site_id?: string;
  location?: string;
  location_lat?: number;
  location_lon?: number;
  local_ip?: string;
  firmware?: string;
  date_added?: number;
  last_online?: number;
  device_retention?: number;
  cloud_retention?: number;
  timezone?: string;
  people_history_enabled?: boolean;
  vehicle_history_enabled?: boolean;
}

function buildCameraContent(camera: VerkadaCamera): string {
  const parts: string[] = [];

  if (camera.model) {
    parts.push(`Model: ${camera.model}`);
  }
  if (camera.serial) {
    parts.push(`Serial: ${camera.serial}`);
  }
  if (camera.status) {
    parts.push(`Status: ${camera.status}`);
  }
  if (camera.site) {
    parts.push(`Site: ${camera.site}`);
  }
  if (camera.location) {
    parts.push(`Location: ${camera.location}`);
  }
  if (camera.firmware) {
    parts.push(`Firmware: ${camera.firmware}`);
  }
  if (camera.device_retention) {
    parts.push(`Local retention: ${camera.device_retention} days`);
  }
  if (camera.cloud_retention) {
    parts.push(`Cloud retention: ${camera.cloud_retention} days`);
  }

  return parts.join("\n");
}

function buildCameraMetadata(
  camera: VerkadaCamera
): GenericDocument["metadata"] {
  return {
    cameraId: camera.camera_id,
    ...(camera.model && { model: camera.model }),
    ...(camera.serial && { serial: camera.serial }),
    ...(camera.mac && { mac: camera.mac }),
    ...(camera.status && { status: camera.status }),
    ...(camera.site && { site: camera.site }),
    ...(camera.site_id && { siteId: camera.site_id }),
    ...(camera.location_lat != null && { latitude: camera.location_lat }),
    ...(camera.location_lon != null && { longitude: camera.location_lon }),
    ...(camera.local_ip && { localIp: camera.local_ip }),
    ...(camera.firmware && { firmware: camera.firmware }),
    ...(camera.timezone && { timezone: camera.timezone }),
    ...(camera.device_retention != null && {
      deviceRetentionDays: camera.device_retention,
    }),
    ...(camera.cloud_retention != null && {
      cloudRetentionDays: camera.cloud_retention,
    }),
    ...(camera.people_history_enabled != null && {
      peopleHistoryEnabled: camera.people_history_enabled,
    }),
    ...(camera.vehicle_history_enabled != null && {
      vehicleHistoryEnabled: camera.vehicle_history_enabled,
    }),
  };
}

export async function transformCamera(
  camera: VerkadaCamera,
  context: VerkadaTransformContext
): Promise<GenericDocument> {
  const title = camera.name;
  const content = buildCameraContent(camera);
  const metadata = buildCameraMetadata(camera);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();
  const updatedAt = camera.last_online ? camera.last_online * 1000 : now;
  const createdAt = camera.date_added ? camera.date_added * 1000 : updatedAt;

  return {
    id: `${context.connectorId}_camera_${camera.camera_id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: camera.camera_id,
    document_type: "device",
    document_subtype: "camera",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "verkada",
    source_name: context.organizationName,
    url: `https://command.verkada.com/cameras/${camera.camera_id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformCameras(
  cameras: VerkadaCamera[],
  context: VerkadaTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(cameras.map((camera) => transformCamera(camera, context)));
}
