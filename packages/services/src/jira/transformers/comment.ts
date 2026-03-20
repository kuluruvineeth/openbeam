import type { JiraTransformContext } from "@openbeam/types/services/connectors/jira";
import type { GenericDocument } from "@openbeam/vespa";
import type { JiraComment, JiraIssue } from "./issue";
import { stripHtml } from "./utils";

export function transformJiraComment(
  comment: JiraComment,
  issue: JiraIssue,
  context: JiraTransformContext,
  renderedBody?: string
): GenericDocument {
  const content = renderedBody
    ? stripHtml(renderedBody)
    : stripHtml(comment.body);

  const createdAt = new Date(comment.created).getTime();
  const updatedAt = new Date(comment.updated).getTime();

  return {
    id: `${context.connectorId}_comment_${comment.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: comment.id,
    document_type: "comment",
    document_subtype: "issue_comment",
    title: `Comment on [${issue.key}] ${issue.fields.summary}`,
    content,
    author_id: comment.author.accountId,
    author_email: comment.author.emailAddress,
    author_name: comment.author.displayName ?? comment.author.accountId,
    created_at: createdAt,
    updated_at: updatedAt,
    source_id: issue.id,
    source_type: "issue",
    thread_id: issue.id,
    url: `${context.siteUrl}/browse/${issue.key}?focusedId=${comment.id}`,
    is_public: false,
    access_control: [],
    metadata: {
      issueKey: issue.key,
      issueType: issue.fields.issuetype?.name ?? "Task",
      ...(issue.fields.project && {
        projectKey: issue.fields.project.key,
      }),
    },
  };
}
