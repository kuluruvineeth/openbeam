import type { MindtouchTransformContext } from "@openbeam/types/services/connectors/mindtouch";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { MindtouchCategory } from "../api/categories";
import { buildMindtouchUrl } from "./utils";

function buildCategoryContent(category: MindtouchCategory): string {
  const parts: string[] = [];

  parts.push(category.title);

  if (category.path) {
    parts.push(`Path: ${category.path}`);
  }

  if (category["category.parent"]?.title) {
    parts.push(`Parent: ${category["category.parent"].title}`);
  }

  const pageCount = category.pages?.["@totalcount"];
  if (pageCount) {
    parts.push(`Pages: ${pageCount}`);
  }

  return parts.join("\n");
}

export async function transformCategory(
  category: MindtouchCategory,
  context: MindtouchTransformContext
): Promise<GenericDocument> {
  const title = category.title;
  const content = buildCategoryContent(category);

  const metadata: GenericDocument["metadata"] = {
    categoryId: category["@id"],
    ...(category.path && { path: category.path }),
    ...(category["category.parent"] && {
      parentTitle: category["category.parent"].title,
      parentId: category["category.parent"]["@id"],
    }),
    ...(category.pages && {
      pageCount: category.pages["@totalcount"],
    }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const categoryUrl = category["uri.ui"]
    ? category["uri.ui"]
    : buildMindtouchUrl(
        context.instanceUrl,
        `/Category:${encodeURIComponent(category.title)}`
      );

  return {
    id: `${context.connectorId}_category_${category["@id"]}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: category["@id"],
    document_type: "category",
    document_subtype: category["category.parent"] ? "subcategory" : "root",
    title,
    content,
    created_at: category["date.created"]
      ? new Date(category["date.created"]).getTime()
      : Date.now(),
    updated_at: Date.now(),
    source_type: "mindtouch",
    url: categoryUrl,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
