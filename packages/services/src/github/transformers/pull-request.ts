import type {
  GitHubComment,
  GitHubPullRequest,
  GitHubReview,
  GitHubTransformContext,
} from "@openplane/types/services/connectors/github";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface PullRequestTransformOptions {
  repoFullName: string;
  isRepoPrivate: boolean;
  reviews?: GitHubReview[];
  comments?: GitHubComment[];
}

function buildPRDocumentId(connectorId: string, prId: number): string {
  return `${connectorId}_pull_request_${prId}`;
}

function resolvePRState(pr: GitHubPullRequest): string {
  if (pr.merged) {
    return "merged";
  }

  return pr.state;
}

function buildPRContent(
  pr: GitHubPullRequest,
  options: PullRequestTransformOptions
): string {
  const parts: string[] = [];

  if (pr.body) {
    parts.push(pr.body);
  }

  parts.push(`Base: ${pr.base.ref} <- Head: ${pr.head.ref}`);
  parts.push(`State: ${resolvePRState(pr)}`);

  if (pr.draft) {
    parts.push("Draft: yes");
  }

  if (pr.additions !== undefined && pr.deletions !== undefined) {
    parts.push(
      `Changes: +${pr.additions} -${pr.deletions} (${pr.changed_files ?? 0} files)`
    );
  }

  const labels = pr.labels.map((l) => l.name).join(", ");
  if (labels) {
    parts.push(`Labels: ${labels}`);
  }

  if (pr.requested_reviewers?.length) {
    parts.push(
      `Reviewers: ${pr.requested_reviewers.map((r) => r.login).join(", ")}`
    );
  }

  if (options.reviews?.length) {
    parts.push("\n--- Reviews ---");
    for (const review of options.reviews) {
      const author = review.user?.login ?? "unknown";
      const body = review.body ? `: ${review.body}` : "";
      parts.push(`${author} (${review.state})${body}`);
    }
  }

  if (options.comments?.length) {
    parts.push("\n--- Review Comments ---");
    for (const comment of options.comments) {
      const author = comment.user?.login ?? "unknown";
      parts.push(`${author}: ${comment.body}`);
    }
  }

  return parts.join("\n");
}

function buildPRMetadata(
  pr: GitHubPullRequest,
  options: PullRequestTransformOptions
): GenericDocument["metadata"] {
  return {
    prId: pr.id,
    number: pr.number,
    state: resolvePRState(pr),
    draft: pr.draft ?? false,
    repoFullName: options.repoFullName,
    headRef: pr.head.ref,
    baseRef: pr.base.ref,
    labels: pr.labels.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
    })),
    assignees: pr.assignees.map((a) => a.login),
    requestedReviewers: pr.requested_reviewers?.map((r) => r.login) ?? [],
    ...(pr.additions != null && { additions: pr.additions }),
    ...(pr.deletions != null && { deletions: pr.deletions }),
    ...(pr.changed_files != null && { changedFiles: pr.changed_files }),
    ...(pr.merged && { merged: true }),
    ...(pr.merged_at && { mergedAt: pr.merged_at }),
    ...(pr.merged_by && { mergedBy: pr.merged_by.login }),
    ...(pr.milestone && {
      milestoneId: pr.milestone.id,
      milestoneTitle: pr.milestone.title,
    }),
    ...(pr.closed_at && { closedAt: pr.closed_at }),
    reviewCount: options.reviews?.length ?? 0,
    commentCount: options.comments?.length ?? pr.comments,
  };
}

export async function transformPullRequest(
  pr: GitHubPullRequest,
  context: GitHubTransformContext,
  options: PullRequestTransformOptions
): Promise<GenericDocument> {
  const title = `#${pr.number}: ${pr.title}`;
  const content = buildPRContent(pr, options);
  const authorLogin = pr.user?.login;
  const authorName = authorLogin
    ? (context.userLookup?.getName(authorLogin) ?? authorLogin)
    : undefined;
  const authorAvatar = authorLogin
    ? (context.userLookup?.getAvatar(authorLogin) ?? pr.user?.avatar_url)
    : undefined;

  const metadata = buildPRMetadata(pr, options);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: buildPRDocumentId(context.connectorId, pr.id),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(pr.id),
    document_type: "pull_request",
    document_subtype: resolvePRState(pr),
    title,
    content,
    author_id: pr.user ? String(pr.user.id) : undefined,
    author_name: authorName,
    author_avatar_url: authorAvatar,
    created_at: new Date(pr.created_at).getTime(),
    updated_at: new Date(pr.updated_at).getTime(),
    source_id: options.repoFullName,
    source_type: "github",
    source_name: context.organizationName,
    url: pr.html_url,
    is_public: !options.isRepoPrivate,
    access_control: [`team:${context.teamId}`],
    labels: pr.labels.map((l) => l.name),
    assignee_ids: pr.assignees.map((a) => String(a.id)),
    reviewer_ids: pr.requested_reviewers?.map((r) => String(r.id)),
    metadata,
    checksum,
  };
}
