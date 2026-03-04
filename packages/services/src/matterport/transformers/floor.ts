import type {
  MatterportFloor,
  MatterportTransformContext,
} from "@openplane/types/services/connectors/matterport";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface FloorTransformParams {
  modelId: string;
  modelName: string;
}

function buildFloorContent(
  floor: MatterportFloor,
  params: FloorTransformParams
): string {
  const parts: string[] = [];

  parts.push(`Floor in model: ${params.modelName}`);
  parts.push(`Rooms: ${floor.rooms.length}`);

  if (floor.rooms.length > 0) {
    parts.push(`Room names: ${floor.rooms.map((r) => r.label).join(", ")}`);
  }

  return parts.join("\n");
}

function buildFloorMetadata(
  floor: MatterportFloor,
  params: FloorTransformParams
): GenericDocument["metadata"] {
  return {
    floorId: floor.id,
    modelId: params.modelId,
    roomCount: floor.rooms.length,
    roomIds: floor.rooms.map((r) => r.id),
  };
}

export async function transformFloor(
  floor: MatterportFloor,
  context: MatterportTransformContext,
  params: FloorTransformParams
): Promise<GenericDocument> {
  const title = floor.label;
  const content = buildFloorContent(floor, params);
  const metadata = buildFloorMetadata(floor, params);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();

  return {
    id: `${context.connectorId}_floor_${params.modelId}_${floor.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: floor.id,
    document_type: "spatial_floor",
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

export function transformFloors(
  floors: MatterportFloor[],
  context: MatterportTransformContext,
  params: FloorTransformParams
): Promise<GenericDocument[]> {
  return Promise.all(
    floors.map((floor) => transformFloor(floor, context, params))
  );
}
