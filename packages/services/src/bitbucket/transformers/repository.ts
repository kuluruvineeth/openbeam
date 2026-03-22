import type {
  BitbucketRepository,
  BitbucketTransformContext,
} from "@openbeam/types/services/connectors/bitbucket";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildRepoContent(repo: BitbucketRepository): string {
  const parts: string[] = [];

  if (repo.description) {
    parts.push(repo.description);
  }

  if (repo.language) {
    parts.push(`Language: ${repo.language}`);
  }

  if (repo.mainbranch?.name) {
    parts.push(`Default branch: ${repo.mainbranch.name}`);
  }

  if (repo.project) {
    parts.push(`Project: ${repo.project.name} (${repo.project.key})`);
  }

  parts.push(`Visibility: ${repo.is_private ? "private" : "public"}`);

  if (repo.fork_policy) {
    parts.push(`Fork policy: ${repo.fork_policy}`);
  }

  return parts.join("\n");
}

function buildRepoMetadata(
  repo: BitbucketRepository
): GenericDocument["metadata"] {
  return {
    uuid: repo.uuid,
    slug: repo.slug,
    fullName: repo.full_name,
    language: repo.language ?? "",
    visibility: repo.is_private ? "private" : "public",
    defaultBranch: repo.mainbranch?.name ?? "",
    forkPolicy: repo.fork_policy ?? "",
    hasIssues: repo.has_issues ?? false,
    hasWiki: repo.has_wiki ?? false,
    ownerName: repo.owner?.display_name ?? "",
    ...(repo.project && {
      projectKey: repo.project.key,
      projectName: repo.project.name,
    }),
  };
}

export async function transformRepository(
  repo: BitbucketRepository,
  context: BitbucketTransformContext
): Promise<GenericDocument> {
  const title = repo.full_name;
  const content = buildRepoContent(repo);
  const metadata = buildRepoMetadata(repo);
  const url =
    repo.links?.html?.href ?? `https://bitbucket.org/${repo.full_name}`;

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_repository_${repo.uuid}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: repo.uuid,
    document_type: "repository",
    document_subtype: repo.is_private ? "private" : "public",
    title,
    content,
    author_id: repo.owner?.uuid,
    author_name: repo.owner?.display_name,
    author_avatar_url: repo.owner?.links?.avatar?.href,
    created_at: new Date(repo.created_on).getTime(),
    updated_at: new Date(repo.updated_on).getTime(),
    source_id: repo.uuid,
    source_type: "bitbucket",
    source_name: context.workspaceSlug,
    url,
    is_public: !repo.is_private,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
