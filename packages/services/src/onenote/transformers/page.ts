import type { OneNoteTransformContext } from "@openbeam/types/services/connectors/onenote";
import type { GenericDocument } from "@openbeam/vespa";
import type { OneNotePage } from "../api/pages";
import { buildOneNoteWebUrl, stripHtml } from "./utils";

export function transformOneNotePage(
  page: OneNotePage,
  context: OneNoteTransformContext,
  htmlContent?: string
): GenericDocument {
  const createdAt = new Date(page.createdDateTime).getTime();
  const updatedAt = new Date(page.lastModifiedDateTime).getTime();
  const webUrl = buildOneNoteWebUrl(page);
  const sectionName = page.parentSection?.displayName;
  const notebookName = page.parentNotebook?.displayName;

  let content = page.title;
  let contentHtml: string | undefined;

  if (htmlContent) {
    contentHtml = htmlContent;
    content = stripHtml(htmlContent);
  }

  return {
    id: `${context.connectorId}_page_${page.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: page.id,
    document_type: "page",
    document_subtype: "page",
    title: page.title || "(Untitled)",
    content,
    content_html: contentHtml,
    created_at: createdAt,
    updated_at: updatedAt,
    url: webUrl,
    author_email: context.userEmail,
    author_name: context.userEmail,
    is_public: false,
    access_control: [],
    source_id: page.parentSection?.id,
    source_type: "section",
    metadata: {
      ...(sectionName && { sectionName }),
      ...(notebookName && { notebookName }),
      ...(page.parentSection?.id && { sectionId: page.parentSection.id }),
      ...(page.parentNotebook?.id && { notebookId: page.parentNotebook.id }),
      ...(page.level !== undefined && { level: String(page.level) }),
      ...(page.userTags &&
        page.userTags.length > 0 && { tags: page.userTags.join(", ") }),
    },
  };
}
