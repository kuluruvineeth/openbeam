import type {
  GitLabMergeRequest,
  GitLabNote,
  GitLabTransformContext,
} from "@openbeam/types/services/connectors/gitlab";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface MergeRequestTransformOptions {
  projectPath: string;
  isProjectPrivate: boolean;
  notes?: GitLabNote[];
}

function buildMergeRequestContent(
  mr: GitLabMergeRequest,
  options: MergeRequestTransformOptions
): string {
  const parts: string[] = [];

  if (mr.description) {
    parts.push(mr.description);
  }

  parts.push(`State: ${mr.state}`);
  parts.push(`${mr.source_branch} -> ${mr.target_branch}`);

  if (mr.labels.length > 0) {
    parts.push(`Labels: ${mr.labels.join(", ")}`);
  }

  if (mr.assignees?.length) {
    parts.push(`Assignees: ${mr.assignees.map((a) => a.username).join(", ")}`);
  }

  if (mr.reviewers?.length) {
    parts.push(`Reviewers: ${mr.reviewers.map((r) => r.username).join(", ")}`);
  }

  if (mr.milestone) {
    parts.push(`Milestone: ${mr.milestone.title}`);
  }

  if (mr.draft) {
    parts.push("Draft: yes");
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

export async function transformMergeRequest(
  mr: GitLabMergeRequest,
  context: GitLabTransformContext,
  options: MergeRequestTransformOptions
): Promise<GenericDocument> {
  const title = `!${mr.iid}: ${mr.title}`;
  const content = buildMergeRequestContent(mr, options);
  const authorName = mr.author?.name ?? mr.author?.username;

  const metadata = {
    mergeRequestId: mr.id,
    iid: mr.iid,
    projectId: mr.project_id,
    state: mr.state,
    projectPath: options.projectPath,
    sourceBranch: mr.source_branch,
    targetBranch: mr.target_branch,
    labels: mr.labels,
    assignees: (mr.assignees ?? []).map((a) => a.username),
    reviewers: (mr.reviewers ?? []).map((r) => r.username),
    draft: mr.draft ?? false,
    ...(mr.merged_at && { mergedAt: mr.merged_at }),
    ...(mr.merged_by && { mergedBy: mr.merged_by.username }),
    ...(mr.closed_at && { closedAt: mr.closed_at }),
    ...(mr.milestone && {
      milestoneId: mr.milestone.id,
      milestoneTitle: mr.milestone.title,
    }),
    noteCount: options.notes?.length ?? mr.user_notes_count ?? 0,
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_merge_request_${mr.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(mr.id),
    document_type: "merge_request",
    document_subtype: mr.state,
    title,
    content,
    author_id: mr.author ? String(mr.author.id) : undefined,
    author_name: authorName,
    author_avatar_url: mr.author?.avatar_url ?? undefined,
    created_at: new Date(mr.created_at).getTime(),
    updated_at: new Date(mr.updated_at).getTime(),
    source_id: options.projectPath,
    source_type: "gitlab",
    url: mr.web_url,
    is_public: !options.isProjectPrivate,
    access_control: [`team:${context.teamId}`],
    labels: mr.labels,
    assignee_ids: (mr.assignees ?? []).map((a) => String(a.id)),
    metadata,
    checksum,
  };
}
