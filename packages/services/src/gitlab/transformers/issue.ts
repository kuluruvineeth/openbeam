import type {
  GitLabIssue,
  GitLabNote,
  GitLabTransformContext,
} from "@openbeam/types/services/connectors/gitlab";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface IssueTransformOptions {
  projectPath: string;
  isProjectPrivate: boolean;
  notes?: GitLabNote[];
}

function buildIssueContent(
  issue: GitLabIssue,
  options: IssueTransformOptions
): string {
  const parts: string[] = [];

  if (issue.description) {
    parts.push(issue.description);
  }

  if (issue.labels.length > 0) {
    parts.push(`Labels: ${issue.labels.join(", ")}`);
  }

  parts.push(`State: ${issue.state}`);

  if (issue.assignees.length > 0) {
    parts.push(
      `Assignees: ${issue.assignees.map((a) => a.username).join(", ")}`
    );
  }

  if (issue.milestone) {
    parts.push(`Milestone: ${issue.milestone.title}`);
  }

  if (issue.weight != null) {
    parts.push(`Weight: ${issue.weight}`);
  }

  if (options.notes?.length) {
    parts.push("\n--- Notes ---");
    for (const note of options.notes) {
      const author = note.author?.username ?? "unknown";
      parts.push(`${author}: ${note.body}`);
    }
  }

  return parts.join("\n");
}

export async function transformIssue(
  issue: GitLabIssue,
  context: GitLabTransformContext,
  options: IssueTransformOptions
): Promise<GenericDocument> {
  const title = `#${issue.iid}: ${issue.title}`;
  const content = buildIssueContent(issue, options);
  const authorName = issue.author?.name ?? issue.author?.username;

  const metadata = {
    issueId: issue.id,
    iid: issue.iid,
    projectId: issue.project_id,
    state: issue.state,
    projectPath: options.projectPath,
    labels: issue.labels,
    assignees: issue.assignees.map((a) => a.username),
    ...(issue.milestone && {
      milestoneId: issue.milestone.id,
      milestoneTitle: issue.milestone.title,
    }),
    ...(issue.closed_at && { closedAt: issue.closed_at }),
    ...(issue.weight != null && { weight: issue.weight }),
    confidential: issue.confidential ?? false,
    noteCount: options.notes?.length ?? issue.user_notes_count ?? 0,
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_issue_${issue.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(issue.id),
    document_type: "issue",
    document_subtype: issue.state,
    title,
    content,
    author_id: issue.author ? String(issue.author.id) : undefined,
    author_name: authorName,
    author_avatar_url: issue.author?.avatar_url ?? undefined,
    created_at: new Date(issue.created_at).getTime(),
    updated_at: new Date(issue.updated_at).getTime(),
    source_id: options.projectPath,
    source_type: "gitlab",
    url: issue.web_url,
    is_public: !options.isProjectPrivate,
    access_control: [`team:${context.teamId}`],
    labels: issue.labels,
    assignee_ids: issue.assignees.map((a) => String(a.id)),
    metadata,
    checksum,
  };
}
