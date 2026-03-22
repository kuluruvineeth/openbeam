import type {
  BitbucketComment,
  BitbucketPullRequest,
  BitbucketTransformContext,
} from "@openbeam/types/services/connectors/bitbucket";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface PRTransformOptions {
  repoFullName: string;
  repoSlug: string;
  isPrivate: boolean;
  comments?: BitbucketComment[];
}

function resolveState(pr: BitbucketPullRequest): string {
  return pr.state.toLowerCase();
}

function buildPRContent(
  pr: BitbucketPullRequest,
  options: PRTransformOptions
): string {
  const parts: string[] = [];

  if (pr.description) {
    parts.push(pr.description);
  }

  const sourceBranch = pr.source?.branch?.name ?? "unknown";
  const destBranch = pr.destination?.branch?.name ?? "unknown";
  parts.push(`Branches: ${sourceBranch} -> ${destBranch}`);
  parts.push(`State: ${resolveState(pr)}`);

  if (pr.reviewers?.length) {
    parts.push(
      `Reviewers: ${pr.reviewers.map((r) => r.display_name).join(", ")}`
    );
  }

  const approved = pr.participants
    ?.filter((p) => p.approved)
    .map((p) => p.user.display_name);
  if (approved?.length) {
    parts.push(`Approved by: ${approved.join(", ")}`);
  }

  if (options.comments?.length) {
    parts.push("\n--- Comments ---");
    for (const comment of options.comments) {
      const author = comment.user.display_name;
      const body = comment.content.raw ?? "";
      if (body) {
        parts.push(`${author}: ${body}`);
      }
    }
  }

  return parts.join("\n");
}

function buildPRMetadata(
  pr: BitbucketPullRequest,
  options: PRTransformOptions
): GenericDocument["metadata"] {
  return {
    prId: pr.id,
    state: resolveState(pr),
    repoFullName: options.repoFullName,
    sourceBranch: pr.source?.branch?.name ?? "",
    destinationBranch: pr.destination?.branch?.name ?? "",
    reviewers: pr.reviewers?.map((r) => r.display_name) ?? [],
    commentCount: pr.comment_count ?? 0,
    taskCount: pr.task_count ?? 0,
    ...(pr.merge_commit && { mergeCommit: pr.merge_commit.hash }),
    ...(pr.closed_by && { closedBy: pr.closed_by.display_name }),
  };
}

export async function transformPullRequest(
  pr: BitbucketPullRequest,
  context: BitbucketTransformContext,
  options: PRTransformOptions
): Promise<GenericDocument> {
  const title = `#${pr.id}: ${pr.title}`;
  const content = buildPRContent(pr, options);
  const metadata = buildPRMetadata(pr, options);
  const url =
    pr.links?.html?.href ??
    `https://bitbucket.org/${options.repoFullName}/pull-requests/${pr.id}`;

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_pull_request_${options.repoFullName}_${pr.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: `${options.repoFullName}/pullrequests/${pr.id}`,
    document_type: "pull_request",
    document_subtype: resolveState(pr),
    title,
    content,
    author_id: pr.author?.uuid,
    author_name: pr.author?.display_name,
    author_avatar_url: pr.author?.links?.avatar?.href,
    created_at: new Date(pr.created_on).getTime(),
    updated_at: new Date(pr.updated_on).getTime(),
    source_id: options.repoFullName,
    source_type: "bitbucket",
    source_name: context.workspaceSlug,
    url,
    is_public: !options.isPrivate,
    access_control: [`team:${context.teamId}`],
    labels: [],
    reviewer_ids: pr.reviewers?.map((r) => r.uuid),
    metadata,
    checksum,
  };
}
