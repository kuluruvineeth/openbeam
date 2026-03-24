import type { CanvaTransformContext } from "@openbeam/types/services/connectors/canva";
import type { GenericDocument } from "@openbeam/vespa";
import type { CanvaDesign } from "../api/designs";
import { buildCanvaUrl } from "./utils";

export function transformCanvaDesign(
  design: CanvaDesign,
  context: CanvaTransformContext
): GenericDocument {
  const parts = [
    design.doc_type ? `Type: ${design.doc_type}` : null,
    design.page_count ? `Pages: ${design.page_count}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(design.created_at).getTime();
  const updatedAt = new Date(design.updated_at).getTime();

  return {
    id: `${context.connectorId}_design_${design.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: design.id,
    document_type: "design",
    document_subtype: design.doc_type,
    title: design.title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: design.urls?.edit_url ?? buildCanvaUrl(design.id),
    author_name: design.owner?.user_id,
    is_public: false,
    access_control: [],
    metadata: {
      ...(design.doc_type && { docType: design.doc_type }),
      ...(design.page_count && { pageCount: String(design.page_count) }),
      ...(design.owner?.team_id && { teamId: design.owner.team_id }),
      ...(design.thumbnail?.url && { thumbnailUrl: design.thumbnail.url }),
    },
  };
}
