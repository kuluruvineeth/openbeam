import type { JFrogTransformContext } from "@openbeam/types/services/connectors/jfrog";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { JFrogRepository } from "../api/repositories";
import { buildJFrogRepoUrl } from "./utils";

function buildRepoContent(repo: JFrogRepository): string {
  const parts: string[] = [];

  if (repo.description) {
    parts.push(repo.description);
  }

  parts.push(`Type: ${repo.type}`);
  parts.push(`Package Type: ${repo.packageType}`);

  if (repo.layoutRef) {
    parts.push(`Layout: ${repo.layoutRef}`);
  }

  if (repo.environments?.length) {
    parts.push(`Environments: ${repo.environments.join(", ")}`);
  }

  return parts.join("\n");
}

function buildRepoMetadata(repo: JFrogRepository): GenericDocument["metadata"] {
  return {
    repoKey: repo.key,
    repoType: repo.type,
    packageType: repo.packageType,
    ...(repo.layoutRef && { layoutRef: repo.layoutRef }),
    ...(repo.environments?.length && {
      environments: repo.environments.join(", "),
    }),
  };
}

export async function transformRepository(
  repo: JFrogRepository,
  context: JFrogTransformContext
): Promise<GenericDocument> {
  const title = repo.key;
  const content = buildRepoContent(repo);
  const metadata = buildRepoMetadata(repo);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_repository_${repo.key}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: repo.key,
    document_type: "repository",
    document_subtype: repo.packageType,
    title,
    content,
    created_at: Date.now(),
    updated_at: Date.now(),
    source_type: "jfrog",
    url: buildJFrogRepoUrl(context.instanceUrl, repo.key),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
