import type { CanvaTransformContext } from "@openbeam/types/services/connectors/canva";
import type { GenericDocument } from "@openbeam/vespa";
import type { CanvaBrandTemplate } from "../api/brand-templates";

export function transformCanvaBrandTemplate(
  template: CanvaBrandTemplate,
  context: CanvaTransformContext
): GenericDocument {
  const content = template.description ?? `Brand template: ${template.title}`;
  const createdAt = new Date(template.created_at).getTime();
  const updatedAt = new Date(template.updated_at).getTime();

  return {
    id: `${context.connectorId}_brand_template_${template.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: template.id,
    document_type: "brand_template",
    title: template.title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: "https://www.canva.com/brand/brand-templates",
    is_public: false,
    access_control: [],
    metadata: {
      ...(template.description && { description: template.description }),
      ...(template.thumbnail?.url && {
        thumbnailUrl: template.thumbnail.url,
      }),
    },
  };
}
