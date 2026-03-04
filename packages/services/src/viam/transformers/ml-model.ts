import type {
  ViamMLModel,
  ViamTransformContext,
} from "@openplane/types/services/connectors/viam";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildMLModelContent(model: ViamMLModel): string {
  const parts: string[] = [];

  parts.push(`Architecture: ${model.architecture}`);
  parts.push(`Framework: ${model.framework}`);
  parts.push(`Version: ${model.version}`);
  parts.push(`Status: ${model.status}`);

  return parts.join("\n");
}

function buildMLModelMetadata(model: ViamMLModel): GenericDocument["metadata"] {
  return {
    modelId: model.id,
    architecture: model.architecture,
    framework: model.framework,
    version: model.version,
    status: model.status,
  };
}

export async function transformMLModel(
  model: ViamMLModel,
  context: ViamTransformContext
): Promise<GenericDocument> {
  const title = model.name;
  const content = buildMLModelContent(model);
  const metadata = buildMLModelMetadata(model);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_mlmodel_${model.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: model.id,
    document_type: "robot_ml_model",
    title,
    content,
    version: model.version,
    created_at: new Date(model.createdOn).getTime(),
    updated_at: new Date(model.createdOn).getTime(),
    source_type: "viam",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformMLModels(
  models: ViamMLModel[],
  context: ViamTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(models.map((m) => transformMLModel(m, context)));
}
