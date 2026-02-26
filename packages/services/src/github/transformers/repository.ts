import type {
  GitHubRepository,
  GitHubTransformContext,
} from "@openplane/types/services/connectors/github";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildRepoDocumentId(connectorId: string, repoId: number): string {
  return `${connectorId}_repository_${repoId}`;
}

function buildRepoContent(repo: GitHubRepository): string {
  const parts: string[] = [];

  if (repo.description) {
    parts.push(repo.description);
  }

  if (repo.language) {
    parts.push(`Language: ${repo.language}`);
  }

  if (repo.topics?.length) {
    parts.push(`Topics: ${repo.topics.join(", ")}`);
  }

  parts.push(`Default branch: ${repo.default_branch}`);
  parts.push(`Stars: ${repo.stargazers_count}`);
  parts.push(`Forks: ${repo.forks_count}`);
  parts.push(`Open issues: ${repo.open_issues_count}`);

  return parts.join("\n");
}

function buildRepoMetadata(
  repo: GitHubRepository
): GenericDocument["metadata"] {
  return {
    repoId: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    language: repo.language,
    stargazersCount: repo.stargazers_count,
    forksCount: repo.forks_count,
    openIssuesCount: repo.open_issues_count,
    visibility: repo.private ? "private" : (repo.visibility ?? "public"),
    defaultBranch: repo.default_branch,
    topics: repo.topics ?? [],
    ownerLogin: repo.owner.login,
  };
}

export async function transformRepository(
  repo: GitHubRepository,
  context: GitHubTransformContext
): Promise<GenericDocument> {
  const title = repo.full_name;
  const content = buildRepoContent(repo);
  const metadata = buildRepoMetadata(repo);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: buildRepoDocumentId(context.connectorId, repo.id),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(repo.id),
    document_type: "repository",
    document_subtype: repo.private ? "private" : "public",
    title,
    content,
    author_id: String(repo.owner.id),
    author_name: repo.owner.login,
    author_avatar_url: repo.owner.avatar_url,
    created_at: new Date(repo.created_at).getTime(),
    updated_at: new Date(repo.updated_at).getTime(),
    source_id: String(repo.id),
    source_type: "github",
    source_name: context.organizationName,
    url: repo.html_url,
    is_public: !repo.private,
    access_control: [`team:${context.teamId}`],
    labels: repo.topics,
    metadata,
    checksum,
  };
}
