import type { JiraTransformContext } from "@openbeam/types/services/connectors/jira";
import type { GenericDocument } from "@openbeam/vespa";
import { stripHtml } from "./utils";

export type JiraIssue = {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: string;
    status?: { name: string; statusCategory?: { name: string } };
    issuetype?: { name: string; subtask?: boolean };
    priority?: { name: string };
    assignee?: {
      accountId: string;
      displayName?: string;
      emailAddress?: string;
    };
    reporter?: {
      accountId: string;
      displayName?: string;
      emailAddress?: string;
    };
    creator?: {
      accountId: string;
      displayName?: string;
      emailAddress?: string;
    };
    labels?: string[];
    components?: Array<{ name: string }>;
    project?: { key: string; name: string };
    created: string;
    updated: string;
    resolutiondate?: string;
    resolution?: { name: string };
    comment?: {
      comments: JiraComment[];
      total: number;
    };
    parent?: { key: string; fields?: { summary?: string } };
  };
  renderedFields?: {
    description?: string;
    comment?: { comments: Array<{ body: string }> };
  };
};

export type JiraComment = {
  id: string;
  author: {
    accountId: string;
    displayName?: string;
    emailAddress?: string;
  };
  body: string;
  renderedBody?: string;
  created: string;
  updated: string;
};

export function transformJiraIssue(
  issue: JiraIssue,
  context: JiraTransformContext
): GenericDocument {
  const { fields, renderedFields } = issue;

  const descriptionHtml = renderedFields?.description ?? fields.description;
  const content = descriptionHtml ? stripHtml(descriptionHtml) : "";

  const createdAt = new Date(fields.created).getTime();
  const updatedAt = new Date(fields.updated).getTime();

  const reporter = fields.reporter;
  const assignee = fields.assignee;
  const issueTypeName = fields.issuetype?.name ?? "Task";

  const components = fields.components?.map((c) => c.name) ?? [];
  const labels = fields.labels ?? [];

  return {
    id: `${context.connectorId}_issue_${issue.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: issue.id,
    document_type: "issue",
    document_subtype: issueTypeName.toLowerCase(),
    title: `[${issue.key}] ${fields.summary}`,
    content,
    author_id: reporter?.accountId,
    author_email: reporter?.emailAddress,
    author_name: reporter?.displayName ?? reporter?.accountId,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `${context.siteUrl}/browse/${issue.key}`,
    is_public: false,
    access_control: [],
    metadata: {
      issueKey: issue.key,
      issueType: issueTypeName,
      status: fields.status?.name ?? "Unknown",
      ...(fields.status?.statusCategory && {
        statusCategory: fields.status.statusCategory.name,
      }),
      ...(fields.priority && { priority: fields.priority.name }),
      ...(assignee && {
        assignee: assignee.displayName ?? assignee.accountId,
      }),
      ...(fields.project && {
        projectKey: fields.project.key,
        projectName: fields.project.name,
      }),
      ...(labels.length > 0 && { labels: labels.join(", ") }),
      ...(components.length > 0 && { components: components.join(", ") }),
      ...(fields.resolution && { resolution: fields.resolution.name }),
      ...(fields.parent && { parentKey: fields.parent.key }),
    },
  };
}
