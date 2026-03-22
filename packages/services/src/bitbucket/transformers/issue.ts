import type {
  BitbucketComment,
  BitbucketIssue,
  BitbucketTransformContext,
} from "@openbeam/types/services/connectors/bitbucket";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface IssueTransformOptions {
  repoFullName: string;
  repoSlug: string;
  isPrivate: boolean;
  comments?: BitbucketComment[];
}

function buildIssueContent(
  issue: BitbucketIssue,
  options: IssueTransformOptions
): string {
  const parts: string[] = [];

  if (issue.content?.raw) {
    parts.push(issue.content.raw);
  }

  parts.push(`State: ${issue.state}`);

  if (issue.priority) {
    parts.push(`Priority: ${issue.priority}`);
  }

  if (issue.kind) {
    parts.push(`Kind: ${issue.kind}`);
  }

  if (issue.component?.name) {
    parts.push(`Component: ${issue.component.name}`);
  }

  if (issue.milestone?.name) {
    parts.push(`Milestone: ${issue.milestone.name}`);
  }

  if (issue.version?.name) {
    parts.push(`Version: ${issue.version.name}`);
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

function buildIssueMetadata(
  issue: BitbucketIssue,
  options: IssueTransformOptions
): GenericDocument["metadata"] {
  return {
    issueId: issue.id,
    state: issue.state,
    priority: issue.priority ?? "",
    kind: issue.kind ?? "",
    repoFullName: options.repoFullName,
    votes: issue.votes ?? 0,
    ...(issue.component && { component: issue.component.name }),
    ...(issue.milestone && { milestone: issue.milestone.name }),
    ...(issue.version && { version: issue.version.name }),
    ...(issue.assignee && { assignee: issue.assignee.display_name }),
  };
}

export async function transformIssue(
  issue: BitbucketIssue,
  context: BitbucketTransformContext,
  options: IssueTransformOptions
): Promise<GenericDocument> {
  const title = `#${issue.id}: ${issue.title}`;
  const content = buildIssueContent(issue, options);
  const metadata = buildIssueMetadata(issue, options);
  const url =
    issue.links?.html?.href ??
    `https://bitbucket.org/${options.repoFullName}/issues/${issue.id}`;

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_issue_${options.repoFullName}_${issue.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: `${options.repoFullName}/issues/${issue.id}`,
    document_type: "issue",
    document_subtype: issue.state,
    title,
    content,
    author_id: issue.reporter?.uuid,
    author_name: issue.reporter?.display_name,
    author_avatar_url: issue.reporter?.links?.avatar?.href,
    created_at: new Date(issue.created_on).getTime(),
    updated_at: new Date(issue.updated_on).getTime(),
    source_id: options.repoFullName,
    source_type: "bitbucket",
    source_name: context.workspaceSlug,
    url,
    is_public: !options.isPrivate,
    access_control: [`team:${context.teamId}`],
    assignee_ids: issue.assignee ? [issue.assignee.uuid] : undefined,
    metadata,
    checksum,
  };
}
