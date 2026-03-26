import type { SimpplrTransformContext } from "@openbeam/types/services/connectors/simpplr";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { SimpplrPage } from "../api/pages";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function buildPageContent(page: SimpplrPage): string {
  const parts: string[] = [page.title];

  if (page.summary) {
    parts.push(stripHtml(page.summary));
  }

  if (page.content) {
    parts.push(stripHtml(page.content));
  }

  if (page.siteName) {
    parts.push(`Site: ${page.siteName}`);
  }

  if (page.author) {
    parts.push(`Author: ${page.author.displayName}`);
  }

  return parts.join("\n");
}

export async function transformPage(
  page: SimpplrPage,
  context: SimpplrTransformContext
): Promise<GenericDocument> {
  const title = page.title;
  const content = buildPageContent(page);
  const metadata: GenericDocument["metadata"] = {
    ...(page.status && { status: page.status }),
    ...(page.siteName && { site: page.siteName }),
    ...(page.author && { author: page.author.displayName }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_page_${page.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: page.id,
    document_type: "page",
    document_subtype: page.status,
    title,
    content,
    url: page.url ?? `${context.instanceUrl}/page/${page.id}`,
    created_at: new Date(page.createdAt).getTime(),
    updated_at: new Date(page.updatedAt).getTime(),
    source_type: "simpplr",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: page.author?.displayName,
    author_email: page.author?.email,
  };
}
