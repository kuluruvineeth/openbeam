import type { MindtouchTransformContext } from "@openbeam/types/services/connectors/mindtouch";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { MindtouchPage, MindtouchPageTag } from "../api/pages";
import { buildMindtouchUrl, stripHtml } from "./utils";

function normalizeTagArray(
  data: MindtouchPageTag[] | MindtouchPageTag | undefined
): MindtouchPageTag[] {
  if (!data) {
    return [];
  }
  return Array.isArray(data) ? data : [data];
}

function buildPageContent(page: MindtouchPage, htmlContent?: string): string {
  const parts: string[] = [];

  if (htmlContent) {
    parts.push(stripHtml(htmlContent));
  }

  if (page.path) {
    parts.push(`Path: ${page.path}`);
  }

  const tags = normalizeTagArray(page.tags?.tag);
  if (tags.length > 0) {
    parts.push(`Tags: ${tags.map((t) => t["@value"]).join(", ")}`);
  }

  if (page["user.author"]?.fullname) {
    parts.push(`Author: ${page["user.author"].fullname}`);
  }

  if (page["page.parent"]?.title) {
    parts.push(`Parent: ${page["page.parent"].title}`);
  }

  return parts.join("\n");
}

export async function transformPage(
  page: MindtouchPage,
  context: MindtouchTransformContext,
  htmlContent?: string
): Promise<GenericDocument> {
  const title = page.title;
  const content = buildPageContent(page, htmlContent);
  const tags = normalizeTagArray(page.tags?.tag);

  const metadata: GenericDocument["metadata"] = {
    pageId: page["@id"],
    revision: page["@revision"] ?? "",
    path: page.path ?? "",
    ...(tags.length > 0 && {
      tags: tags.map((t) => t["@value"]).join(", "),
    }),
    ...(page["page.parent"] && {
      parentTitle: page["page.parent"].title,
      parentId: page["page.parent"]["@id"],
    }),
    ...(page["user.author"] && {
      authorUsername: page["user.author"].username,
    }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const pageUrl = page["uri.ui"]
    ? page["uri.ui"]
    : buildMindtouchUrl(context.instanceUrl, `/${page.path ?? page["@id"]}`);

  return {
    id: `${context.connectorId}_page_${page["@id"]}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: page["@id"],
    document_type: "page",
    document_subtype: page["page.parent"] ? "subpage" : "root",
    title,
    content,
    created_at: new Date(page["date.created"]).getTime(),
    updated_at: new Date(page["date.modified"]).getTime(),
    source_type: "mindtouch",
    url: pageUrl,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: page["user.author"]?.fullname,
    author_email: page["user.author"]?.email,
  };
}
