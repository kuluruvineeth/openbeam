import type { InteractTransformContext } from "@openbeam/types/services/connectors/interact";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { InteractPage } from "../api/pages";

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

function buildPageContent(page: InteractPage): string {
  const parts: string[] = [];

  parts.push(page.Title);

  if (page.Summary) {
    parts.push(stripHtml(page.Summary));
  }

  if (page.Content) {
    parts.push(stripHtml(page.Content));
  }

  if (page.Section) {
    parts.push(`Section: ${page.Section}`);
  }

  if (page.Author) {
    parts.push(`Author: ${page.Author.DisplayName}`);
  }

  return parts.join("\n");
}

export async function transformPage(
  page: InteractPage,
  context: InteractTransformContext
): Promise<GenericDocument> {
  const title = page.Title;
  const content = buildPageContent(page);
  const metadata: GenericDocument["metadata"] = {
    status: page.Status,
    ...(page.Section && { section: page.Section }),
    ...(page.Author && { author: page.Author.DisplayName }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_page_${page.Id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: page.Id,
    document_type: "page",
    document_subtype: page.Status,
    title,
    content,
    url: page.Url ?? `${context.instanceUrl}/page/${page.Id}`,
    created_at: new Date(page.CreatedDate).getTime(),
    updated_at: new Date(page.ModifiedDate).getTime(),
    source_type: "interact",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: page.Author?.DisplayName,
    author_email: page.Author?.Email,
  };
}
