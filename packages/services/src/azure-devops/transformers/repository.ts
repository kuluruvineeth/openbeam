const REFS_HEADS_REGEX = /^refs\/heads\//;

import type { AzureDevOpsTransformContext } from "@openbeam/types/services/connectors/azure-devops";
import type { GenericDocument } from "@openbeam/vespa";
import type { AzureDevOpsRepository } from "../api/repositories";

export function transformRepository(
  repo: AzureDevOpsRepository,
  context: AzureDevOpsTransformContext
): GenericDocument {
  const defaultBranch = repo.defaultBranch?.replace(REFS_HEADS_REGEX, "") ?? "";
  const content = [
    repo.name,
    defaultBranch ? `Default branch: ${defaultBranch}` : "",
    `Project: ${repo.project.name}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    id: `${context.connectorId}_repository_${repo.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: repo.id,
    document_type: "repository",
    title: repo.name,
    content,
    created_at: Date.now(),
    updated_at: Date.now(),
    url:
      repo.webUrl ??
      `${context.baseUrl}/${encodeURIComponent(repo.project.name)}/_git/${encodeURIComponent(repo.name)}`,
    is_public: false,
    access_control: [],
    metadata: {
      project: repo.project.name,
      ...(defaultBranch && { defaultBranch }),
      size: String(repo.size),
    },
  };
}
