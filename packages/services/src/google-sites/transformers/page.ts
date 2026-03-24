import type { GoogleSitesTransformContext } from "@openbeam/types/services/connectors/google-sites";
import type { GenericDocument } from "@openbeam/vespa";
import type { GoogleSitePage } from "../api/pages";
import { stripHtml } from "./utils";

export function transformGoogleSitePage(
  page: GoogleSitePage,
  context: GoogleSitesTransformContext,
  siteId: string,
  siteName: string
): GenericDocument {
  const owner = page.owners?.[0];
  const createdAt = new Date(page.createdTime).getTime();
  const updatedAt = new Date(page.modifiedTime).getTime();

  const textContent = page.htmlContent ? stripHtml(page.htmlContent) : "";

  const parts = [textContent || null, `Site: ${siteName}`].filter(Boolean);

  return {
    id: `${context.connectorId}_page_${page.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: page.id,
    document_type: "page",
    document_subtype: "wiki_page",
    title: page.name,
    content: parts.join(" — "),
    created_at: createdAt,
    updated_at: updatedAt,
    url: page.webViewLink ?? `https://sites.google.com/d/${page.id}`,
    author_name: owner?.displayName,
    author_email: owner?.emailAddress,
    is_public: false,
    access_control: [],
    metadata: {
      siteId,
      siteName,
      entityType: "page",
      ...(page.mimeType && { mimeType: page.mimeType }),
    },
  };
}
