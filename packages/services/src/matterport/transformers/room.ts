import type {
  MatterportRoom,
  MatterportTransformContext,
} from "@openbeam/types/services/connectors/matterport";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface RoomTransformParams {
  modelId: string;
  modelName: string;
}

function buildRoomContent(
  room: MatterportRoom,
  params: RoomTransformParams
): string {
  const parts: string[] = [];

  parts.push(`Room in model: ${params.modelName}`);
  parts.push(`Floor area: ${room.floorArea} sq ft`);

  if (room.floor) {
    parts.push(`Floor: ${room.floor.label}`);
  }

  parts.push(
    `Center: (${room.center.x.toFixed(2)}, ${room.center.y.toFixed(2)}, ${room.center.z.toFixed(2)})`
  );

  return parts.join("\n");
}

function buildRoomMetadata(
  room: MatterportRoom,
  params: RoomTransformParams
): GenericDocument["metadata"] {
  return {
    roomId: room.id,
    modelId: params.modelId,
    floorArea: room.floorArea,
    centerX: room.center.x,
    centerY: room.center.y,
    centerZ: room.center.z,
    ...(room.floor && { floorId: room.floor.id, floorLabel: room.floor.label }),
  };
}

export async function transformRoom(
  room: MatterportRoom,
  context: MatterportTransformContext,
  params: RoomTransformParams
): Promise<GenericDocument> {
  const title = room.label;
  const content = buildRoomContent(room, params);
  const metadata = buildRoomMetadata(room, params);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();

  return {
    id: `${context.connectorId}_room_${params.modelId}_${room.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: room.id,
    document_type: "spatial_room",
    title,
    content,
    parent_id: `${context.connectorId}_model_${params.modelId}`,
    created_at: now,
    updated_at: now,
    source_type: "matterport",
    url: `https://my.matterport.com/show/?m=${params.modelId}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformRooms(
  rooms: MatterportRoom[],
  context: MatterportTransformContext,
  params: RoomTransformParams
): Promise<GenericDocument[]> {
  return Promise.all(rooms.map((room) => transformRoom(room, context, params)));
}
