import type { VerkadaTransformContext } from "@openbeam/types/services/connectors/verkada";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface VerkadaDoor {
  door_id: string;
  name: string;
  site?: string;
  site_id?: string;
  acu_id?: string;
  acu_name?: string;
  lock_status?: string;
  door_status?: string;
}

function buildDoorContent(door: VerkadaDoor): string {
  const parts: string[] = [];

  if (door.site) {
    parts.push(`Site: ${door.site}`);
  }
  if (door.acu_name) {
    parts.push(`ACU: ${door.acu_name}`);
  }
  if (door.lock_status) {
    parts.push(`Lock: ${door.lock_status}`);
  }
  if (door.door_status) {
    parts.push(`Door: ${door.door_status}`);
  }

  return parts.join("\n");
}

function buildDoorMetadata(door: VerkadaDoor): GenericDocument["metadata"] {
  return {
    doorId: door.door_id,
    ...(door.site && { site: door.site }),
    ...(door.site_id && { siteId: door.site_id }),
    ...(door.acu_id && { acuId: door.acu_id }),
    ...(door.acu_name && { acuName: door.acu_name }),
    ...(door.lock_status && { lockStatus: door.lock_status }),
    ...(door.door_status && { doorStatus: door.door_status }),
  };
}

export async function transformDoor(
  door: VerkadaDoor,
  context: VerkadaTransformContext
): Promise<GenericDocument> {
  const title = door.name;
  const content = buildDoorContent(door);
  const metadata = buildDoorMetadata(door);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });
  const now = Date.now();

  return {
    id: `${context.connectorId}_door_${door.door_id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: door.door_id,
    document_type: "device",
    document_subtype: "door",
    title,
    content,
    created_at: now,
    updated_at: now,
    source_type: "verkada",
    source_name: context.organizationName,
    url: `https://command.verkada.com/access-control/doors/${door.door_id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformDoors(
  doors: VerkadaDoor[],
  context: VerkadaTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(doors.map((door) => transformDoor(door, context)));
}
