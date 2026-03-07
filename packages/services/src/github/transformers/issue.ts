import type {
  GitHubComment,
  GitHubIssue,
  GitHubTransformContext,
} from "@openbeam/types/services/connectors/github";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface IssueTransformOptions {
  repoFullName: string;
  isRepoPrivate: boolean;
  comments?: GitHubComment[];
}

function buildIssueDocumentId(connectorId: string, issueId: number): string {
  return `${connectorId}_issue_${issueId}`;
}

function buildIssueContent(
  issue: GitHubIssue,
  options: IssueTransformOptions
): string {
  const parts: string[] = [];

  if (issue.body) {
    parts.push(issue.body);
  }

  const labels = issue.labels.map((l) => l.name).join(", ");
  if (labels) {
    parts.push(`Labels: ${labels}`);
  }

  parts.push(`State: ${issue.state}`);

  if (issue.assignees.length > 0) {
    parts.push(`Assignees: ${issue.assignees.map((a) => a.login).join(", ")}`);
  }

  if (issue.milestone) {
    parts.push(`Milestone: ${issue.milestone.title}`);
  }

  if (options.comments?.length) {
    parts.push("\n--- Comments ---");
    for (const comment of options.comments) {
      const author = comment.user?.login ?? "unknown";
      parts.push(`${author}: ${comment.body}`);
    }
  }

  return parts.join("\n");
}

function buildIssueMetadata(
  issue: GitHubIssue,
  options: IssueTransformOptions
): GenericDocument["metadata"] {
  return {
    issueId: issue.id,
    number: issue.number,
    state: issue.state,
    ...(issue.state_reason != null && { stateReason: issue.state_reason }),
    repoFullName: options.repoFullName,
    labels: issue.labels.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
    })),
    assignees: issue.assignees.map((a) => a.login),
    ...(issue.milestone && {
      milestoneId: issue.milestone.id,
      milestoneTitle: issue.milestone.title,
    }),
    ...(issue.closed_at && { closedAt: issue.closed_at }),
    commentCount: options.comments?.length ?? issue.comments,
  };
}

export async function transformIssue(
  issue: GitHubIssue,
  context: GitHubTransformContext,
  options: IssueTransformOptions
): Promise<GenericDocument> {
  const title = `#${issue.number}: ${issue.title}`;
  const content = buildIssueContent(issue, options);
  const authorLogin = issue.user?.login;
  const authorName = authorLogin
    ? (context.userLookup?.getName(authorLogin) ?? authorLogin)
    : undefined;
  const authorAvatar = authorLogin
    ? (context.userLookup?.getAvatar(authorLogin) ?? issue.user?.avatar_url)
    : undefined;

  const metadata = buildIssueMetadata(issue, options);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: buildIssueDocumentId(context.connectorId, issue.id),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(issue.id),
    document_type: "issue",
    document_subtype: issue.state,
    title,
    content,
    author_id: issue.user ? String(issue.user.id) : undefined,
    author_name: authorName,
    author_avatar_url: authorAvatar,
    created_at: new Date(issue.created_at).getTime(),
    updated_at: new Date(issue.updated_at).getTime(),
    source_id: options.repoFullName,
    source_type: "github",
    source_name: context.organizationName,
    url: issue.html_url,
    is_public: !options.isRepoPrivate,
    access_control: [`team:${context.teamId}`],
    labels: issue.labels.map((l) => l.name),
    assignee_ids: issue.assignees.map((a) => String(a.id)),
    metadata,
    checksum,
  };
}
