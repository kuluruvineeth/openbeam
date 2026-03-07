import type {
  LinearComment,
  LinearIssue,
  LinearTransformContext,
} from "@openbeam/types/services/connectors/linear";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface IssueTransformOptions {
  comments?: LinearComment[];
}

function buildIssueDocumentId(connectorId: string, issueId: string): string {
  return `${connectorId}_issue_${issueId}`;
}

function buildIssueContent(
  issue: LinearIssue,
  options: IssueTransformOptions
): string {
  const parts: string[] = [];

  if (issue.description) {
    parts.push(issue.description);
  }

  const labels = issue.labels.nodes.map((l) => l.name).join(", ");
  if (labels) {
    parts.push(`Labels: ${labels}`);
  }

  parts.push(`State: ${issue.state.name}`);
  parts.push(`Priority: ${issue.priorityLabel}`);

  if (issue.assignee) {
    parts.push(`Assignee: ${issue.assignee.displayName}`);
  }

  if (issue.project) {
    parts.push(`Project: ${issue.project.name}`);
  }

  if (issue.cycle?.name) {
    parts.push(`Cycle: ${issue.cycle.name}`);
  }

  if (issue.estimate) {
    parts.push(`Estimate: ${issue.estimate}`);
  }

  if (issue.dueDate) {
    parts.push(`Due: ${issue.dueDate}`);
  }

  if (options.comments?.length) {
    parts.push("\n--- Comments ---");
    for (const comment of options.comments) {
      const author = comment.user?.displayName ?? "Unknown";
      parts.push(`${author}: ${comment.body}`);
    }
  }

  return parts.join("\n");
}

function buildIssueMetadata(
  issue: LinearIssue,
  options: IssueTransformOptions
): GenericDocument["metadata"] {
  return {
    issueId: issue.id,
    identifier: issue.identifier,
    priority: issue.priority,
    priorityLabel: issue.priorityLabel,
    estimate: issue.estimate,
    stateId: issue.state.id,
    stateName: issue.state.name,
    stateType: issue.state.type,
    stateColor: issue.state.color,
    teamId: issue.team.id,
    teamKey: issue.team.key,
    teamName: issue.team.name,
    labels: issue.labels.nodes.map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
    })),
    ...(issue.assignee && { assigneeId: issue.assignee.id }),
    ...(issue.project && {
      projectId: issue.project.id,
      projectName: issue.project.name,
    }),
    ...(issue.cycle && {
      cycleId: issue.cycle.id,
      cycleName: issue.cycle.name,
    }),
    ...(issue.parent && {
      parentId: issue.parent.id,
      parentIdentifier: issue.parent.identifier,
    }),
    ...(issue.dueDate && { dueDate: issue.dueDate }),
    ...(issue.completedAt && { completedAt: issue.completedAt }),
    ...(issue.canceledAt && { canceledAt: issue.canceledAt }),
    ...(issue.archivedAt && { archivedAt: issue.archivedAt }),
    ...(options.comments && { commentCount: options.comments.length }),
  };
}

export async function transformIssue(
  issue: LinearIssue,
  context: LinearTransformContext,
  options: IssueTransformOptions = {}
): Promise<GenericDocument> {
  const title = `${issue.identifier}: ${issue.title}`;
  const content = buildIssueContent(issue, options);
  const creatorId = issue.creator?.id;
  const creatorName = creatorId
    ? (context.userLookup?.getName(creatorId) ?? issue.creator?.displayName)
    : undefined;
  const creatorAvatar = creatorId
    ? (context.userLookup?.getAvatar(creatorId) ?? issue.creator?.avatarUrl)
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
    external_id: issue.id,
    document_type: "issue",
    document_subtype: issue.state.type,
    title,
    content,
    author_id: creatorId,
    author_name: creatorName,
    author_avatar_url: creatorAvatar ?? undefined,
    created_at: new Date(issue.createdAt).getTime(),
    updated_at: new Date(issue.updatedAt).getTime(),
    source_id: issue.team.id,
    source_type: "linear",
    source_name: context.organizationName,
    url: issue.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformIssues(
  issues: LinearIssue[],
  context: LinearTransformContext,
  options: IssueTransformOptions = {}
): Promise<GenericDocument[]> {
  return Promise.all(
    issues.map((issue) => transformIssue(issue, context, options))
  );
}
