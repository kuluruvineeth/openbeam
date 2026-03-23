import type { DocuSignTransformContext } from "@openbeam/types/services/connectors/docusign";
import type { GenericDocument } from "@openbeam/vespa";
import type { DocuSignTemplate } from "../api/templates";
import { buildDocuSignUrl, stripHtml } from "./utils";

export function transformDocuSignTemplate(
  template: DocuSignTemplate,
  context: DocuSignTransformContext
): GenericDocument {
  const parts = [
    template.description ? stripHtml(template.description) : null,
    template.emailSubject ? `Subject: ${template.emailSubject}` : null,
    template.emailBlurb ? stripHtml(template.emailBlurb) : null,
    template.folderName ? `Folder: ${template.folderName}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(template.created).getTime();
  const updatedAt = new Date(template.lastModified).getTime();

  return {
    id: `${context.connectorId}_template_${template.templateId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: template.templateId,
    document_type: "template",
    document_subtype: template.shared === "true" ? "shared" : "private",
    title: template.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildDocuSignUrl(
      context.accountBaseUri,
      context.accountId,
      "template",
      template.templateId
    ),
    author_name: template.owner?.userName,
    author_email: template.owner?.email,
    is_public: false,
    access_control: [],
    metadata: {
      shared: template.shared,
      ...(template.folderName && { folderName: template.folderName }),
      ...(template.folderId && { folderId: template.folderId }),
      ...(template.pageCount !== undefined && {
        pageCount: String(template.pageCount),
      }),
    },
  };
}
