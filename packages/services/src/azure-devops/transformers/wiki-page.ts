import type { AzureDevOpsTransformContext } from "@openbeam/types/services/connectors/azure-devops";
import type { GenericDocument } from "@openbeam/vespa";
import type { AzureDevOpsWikiPage } from "../api/wiki";

export function transformWikiPage(
  page: AzureDevOpsWikiPage,
  projectName: string,
  wikiName: string,
  context: AzureDevOpsTransformContext
): GenericDocument {
  const title = page.path.split("/").pop() ?? page.path;
  const content = page.content ?? "";

  return {
    id: `${context.connectorId}_wiki_page_${page.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(page.id),
    document_type: "wiki_page",
    title,
    content,
    created_at: Date.now(),
    updated_at: Date.now(),
    url: `${context.baseUrl}/${encodeURIComponent(projectName)}/_wiki/wikis/${encodeURIComponent(wikiName)}/${page.id}`,
    is_public: false,
    access_control: [],
    metadata: {
      path: page.path,
      project: projectName,
      wiki: wikiName,
      order: String(page.order),
    },
  };
}
