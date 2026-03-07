import type {
  MatterportSweep,
  MatterportTransformContext,
} from "@openbeam/types/services/connectors/matterport";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface SweepTransformParams {
  modelId: string;
  modelName: string;
}

function buildSweepContent(
  sweep: MatterportSweep,
  params: SweepTransformParams
): string {
  const parts: string[] = [];

  parts.push(`Sweep point in model: ${params.modelName}`);
  parts.push(
    `Position: (${sweep.position.x.toFixed(2)}, ${sweep.position.y.toFixed(2)}, ${sweep.position.z.toFixed(2)})`
  );

  if (sweep.floor) {
    parts.push(`Floor: ${sweep.floor.label}`);
  }
  if (sweep.room) {
    parts.push(`Room: ${sweep.room.label}`);
  }

  parts.push(`Neighbors: ${sweep.neighbors.length}`);

  return parts.join("\n");
}

function buildSweepMetadata(
  sweep: MatterportSweep,
  params: SweepTransformParams
): GenericDocument["metadata"] {
  return {
    sweepId: sweep.id,
    modelId: params.modelId,
    positionX: sweep.position.x,
    positionY: sweep.position.y,
    positionZ: sweep.position.z,
    rotationX: sweep.rotation.x,
    rotationY: sweep.rotation.y,
    rotationZ: sweep.rotation.z,
    neighborCount: sweep.neighbors.length,
    ...(sweep.floor && {
      floorId: sweep.floor.id,
      floorLabel: sweep.floor.label,
    }),
    ...(sweep.room && { roomId: sweep.room.id, roomLabel: sweep.room.label }),
  };
}

export async function transformSweep(
  sweep: MatterportSweep,
  context: MatterportTransformContext,
  params: SweepTransformParams
): Promise<GenericDocument> {
  const title = `Sweep ${sweep.id}`;
  const content = buildSweepContent(sweep, params);
  const metadata = buildSweepMetadata(sweep, params);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();

  return {
    id: `${context.connectorId}_sweep_${params.modelId}_${sweep.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: sweep.id,
    document_type: "spatial_sweep",
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

export function transformSweeps(
  sweeps: MatterportSweep[],
  context: MatterportTransformContext,
  params: SweepTransformParams
): Promise<GenericDocument[]> {
  return Promise.all(
    sweeps.map((sweep) => transformSweep(sweep, context, params))
  );
}
