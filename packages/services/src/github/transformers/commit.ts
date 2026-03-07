import type {
  GitHubCommit,
  GitHubTransformContext,
} from "@openbeam/types/services/connectors/github";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface CommitTransformOptions {
  repoFullName: string;
  isRepoPrivate: boolean;
}

function buildCommitDocumentId(connectorId: string, sha: string): string {
  return `${connectorId}_commit_${sha}`;
}

function buildCommitContent(
  commit: GitHubCommit,
  _options: CommitTransformOptions
): string {
  const parts: string[] = [];

  parts.push(commit.commit.message);

  if (commit.stats) {
    parts.push(
      `Changes: +${commit.stats.additions} -${commit.stats.deletions} (${commit.stats.total} total)`
    );
  }

  return parts.join("\n");
}

function buildCommitMetadata(
  commit: GitHubCommit,
  options: CommitTransformOptions
): GenericDocument["metadata"] {
  return {
    sha: commit.sha,
    shortSha: commit.sha.slice(0, 7),
    repoFullName: options.repoFullName,
    ...(commit.stats && {
      additions: commit.stats.additions,
      deletions: commit.stats.deletions,
      totalChanges: commit.stats.total,
    }),
    ...(commit.commit.author?.email && {
      authorEmail: commit.commit.author.email,
    }),
    ...(commit.commit.committer?.email && {
      committerEmail: commit.commit.committer.email,
    }),
  };
}

export async function transformCommit(
  commit: GitHubCommit,
  context: GitHubTransformContext,
  options: CommitTransformOptions
): Promise<GenericDocument> {
  const firstLine = commit.commit.message.split("\n")[0] ?? commit.sha;
  const title = `${commit.sha.slice(0, 7)}: ${firstLine}`;
  const content = buildCommitContent(commit, options);
  const authorLogin = commit.author?.login;
  const authorName = authorLogin
    ? (context.userLookup?.getName(authorLogin) ?? authorLogin)
    : (commit.commit.author?.name ?? undefined);
  const authorAvatar = authorLogin
    ? (context.userLookup?.getAvatar(authorLogin) ?? commit.author?.avatar_url)
    : undefined;

  const metadata = buildCommitMetadata(commit, options);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const commitDate =
    commit.commit.author?.date ?? commit.commit.committer?.date;

  return {
    id: buildCommitDocumentId(context.connectorId, commit.sha),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: commit.sha,
    document_type: "commit",
    title,
    content,
    author_id: commit.author ? String(commit.author.id) : undefined,
    author_name: authorName,
    author_avatar_url: authorAvatar,
    created_at: commitDate ? new Date(commitDate).getTime() : Date.now(),
    updated_at: commitDate ? new Date(commitDate).getTime() : Date.now(),
    source_id: options.repoFullName,
    source_type: "github",
    source_name: context.organizationName,
    url: commit.html_url,
    is_public: !options.isRepoPrivate,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
