import type {
  MatterportMattertag,
  MatterportTransformContext,
} from "@openbeam/types/services/connectors/matterport";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface MattertagTransformParams {
  modelId: string;
  modelName: string;
}

function buildMattertagContent(
  tag: MatterportMattertag,
  params: MattertagTransformParams
): string {
  const parts: string[] = [];

  parts.push(`Annotation in model: ${params.modelName}`);

  if (tag.description) {
    parts.push(tag.description);
  }

  parts.push(
    `Position: (${tag.position.x.toFixed(2)}, ${tag.position.y.toFixed(2)}, ${tag.position.z.toFixed(2)})`
  );

  if (tag.mediaType) {
    parts.push(`Media: ${tag.mediaType}`);
  }

  return parts.join("\n");
}

function buildMattertagMetadata(
  tag: MatterportMattertag,
  params: MattertagTransformParams
): GenericDocument["metadata"] {
  return {
    mattertagId: tag.id,
    modelId: params.modelId,
    positionX: tag.position.x,
    positionY: tag.position.y,
    positionZ: tag.position.z,
    ...(tag.color && { color: tag.color }),
    ...(tag.mediaType && { mediaType: tag.mediaType }),
    ...(tag.mediaSrc && { mediaSrc: tag.mediaSrc }),
  };
}

export async function transformMattertag(
  tag: MatterportMattertag,
  context: MatterportTransformContext,
  params: MattertagTransformParams
): Promise<GenericDocument> {
  const title = tag.label;
  const content = buildMattertagContent(tag, params);
  const metadata = buildMattertagMetadata(tag, params);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();

  return {
    id: `${context.connectorId}_mattertag_${params.modelId}_${tag.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: tag.id,
    document_type: "spatial_annotation",
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

export function transformMattertags(
  tags: MatterportMattertag[],
  context: MatterportTransformContext,
  params: MattertagTransformParams
): Promise<GenericDocument[]> {
  return Promise.all(
    tags.map((tag) => transformMattertag(tag, context, params))
  );
}
