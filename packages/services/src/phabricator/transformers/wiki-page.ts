import type { PhabricatorTransformContext } from "@openbeam/types/services/connectors/phabricator";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { PhabricatorWikiPage } from "../api/wiki-pages";
import { buildPhabricatorUrl, remarkupToPlainText } from "./utils";

function buildWikiPageContent(page: PhabricatorWikiPage): string {
  const parts: string[] = [];

  const rawContent = page.attachments.content?.content?.raw;
  if (rawContent) {
    parts.push(remarkupToPlainText(rawContent));
  }

  parts.push(`Path: ${page.fields.path}`);
  parts.push(`Status: ${page.fields.status.name}`);

  return parts.join("\n");
}

export async function transformWikiPage(
  page: PhabricatorWikiPage,
  context: PhabricatorTransformContext
): Promise<GenericDocument> {
  const title =
    page.attachments.content?.title ||
    page.fields.path.split("/").pop() ||
    page.fields.path;
  const content = buildWikiPageContent(page);
  const url = buildPhabricatorUrl(context.instanceUrl, `/w${page.fields.path}`);

  const metadata: GenericDocument["metadata"] = {
    pageId: String(page.id),
    phid: page.phid,
    path: page.fields.path,
    status: page.fields.status.name,
    statusValue: page.fields.status.value,
    ...(page.attachments.content?.authorPHID && {
      authorPhid: page.attachments.content.authorPHID,
    }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_wiki_${page.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(page.id),
    document_type: "wiki_page",
    document_subtype: page.fields.status.name,
    title,
    content,
    created_at: page.fields.dateCreated * 1000,
    updated_at: page.fields.dateModified * 1000,
    source_type: "phabricator",
    url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
