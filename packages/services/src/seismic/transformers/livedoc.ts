import type { SeismicTransformContext } from "@openbeam/types/services/connectors/seismic";
import type { GenericDocument } from "@openbeam/vespa";
import type { SeismicLiveDoc } from "../api/livedocs";

export function transformSeismicLiveDoc(
  liveDoc: SeismicLiveDoc,
  context: SeismicTransformContext
): GenericDocument {
  const parts = [
    liveDoc.description,
    liveDoc.templateName ? `Template: ${liveDoc.templateName}` : null,
    liveDoc.format ? `Format: ${liveDoc.format}` : null,
    liveDoc.tags?.length ? `Tags: ${liveDoc.tags.join(", ")}` : null,
  ].filter(Boolean);

  const body = parts.join(" — ");
  const createdAt = new Date(liveDoc.createdAt).getTime();
  const updatedAt = new Date(liveDoc.modifiedAt).getTime();

  return {
    id: `${context.connectorId}_livedoc_${liveDoc.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: liveDoc.id,
    document_type: "livedoc",
    title: liveDoc.name,
    content: body,
    created_at: createdAt,
    updated_at: updatedAt,
    url: liveDoc.url ?? "",
    author_name: liveDoc.createdBy,
    is_public: false,
    access_control: [],
    metadata: {
      ...(liveDoc.templateId && { templateId: liveDoc.templateId }),
      ...(liveDoc.templateName && { templateName: liveDoc.templateName }),
      ...(liveDoc.format && { format: liveDoc.format }),
      ...(liveDoc.tags?.length && { tags: liveDoc.tags.join(", ") }),
    },
  };
}
