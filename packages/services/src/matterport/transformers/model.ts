import type {
  MatterportModel,
  MatterportTransformContext,
} from "@openbeam/types/services/connectors/matterport";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildModelContent(model: MatterportModel): string {
  const parts: string[] = [];

  if (model.description) {
    parts.push(model.description);
  }

  parts.push(`Status: ${model.status}`);
  parts.push(`Visibility: ${model.visibility}`);

  if (model.address) {
    const addr = [
      model.address.line1,
      model.address.city,
      model.address.state,
      model.address.country,
    ]
      .filter(Boolean)
      .join(", ");
    if (addr) {
      parts.push(`Address: ${addr}`);
    }
  }

  if (model.summary) {
    parts.push(
      `Rooms: ${model.summary.rooms}, Floors: ${model.summary.floors}, Area: ${model.summary.area} sq ft`
    );
  }

  return parts.join("\n");
}

function buildModelMetadata(
  model: MatterportModel
): GenericDocument["metadata"] {
  return {
    modelId: model.id,
    status: model.status,
    visibility: model.visibility,
    ...(model.summary && {
      rooms: model.summary.rooms,
      floors: model.summary.floors,
      area: model.summary.area,
    }),
    ...(model.address?.lat != null && { latitude: model.address.lat }),
    ...(model.address?.lng != null && { longitude: model.address.lng }),
  };
}

export async function transformModel(
  model: MatterportModel,
  context: MatterportTransformContext
): Promise<GenericDocument> {
  const title = model.name;
  const content = buildModelContent(model);
  const metadata = buildModelMetadata(model);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_model_${model.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: model.id,
    document_type: "spatial_model",
    title,
    content,
    created_at: new Date(model.created).getTime(),
    updated_at: new Date(model.modified).getTime(),
    source_type: "matterport",
    url: `https://my.matterport.com/show/?m=${model.id}`,
    is_public: model.visibility === "public",
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformModels(
  models: MatterportModel[],
  context: MatterportTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(models.map((model) => transformModel(model, context)));
}
