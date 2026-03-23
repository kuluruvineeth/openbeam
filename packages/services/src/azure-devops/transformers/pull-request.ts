import type { AzureDevOpsTransformContext } from "@openbeam/types/services/connectors/azure-devops";
import type { GenericDocument } from "@openbeam/vespa";
import type { AzureDevOpsPullRequest } from "../api/pull-requests";
import { branchDisplayName, stripHtml } from "./utils";

export function transformPullRequest(
  pr: AzureDevOpsPullRequest,
  context: AzureDevOpsTransformContext
): GenericDocument {
  const description = pr.description ? stripHtml(pr.description) : "";
  const createdAt = new Date(pr.creationDate).getTime();
  const updatedAt = pr.closedDate
    ? new Date(pr.closedDate).getTime()
    : createdAt;

  const reviewerNames =
    pr.reviewers?.map((r) => r.displayName).filter(Boolean) ?? [];
  const labels = pr.labels?.map((l) => l.name) ?? [];
  const projectName = pr.repository.project.name;

  return {
    id: `${context.connectorId}_pull_request_${pr.pullRequestId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(pr.pullRequestId),
    document_type: "pull_request",
    document_subtype: pr.status.toLowerCase(),
    title: `PR #${pr.pullRequestId}: ${pr.title}`,
    content: description,
    author_id: pr.createdBy.id,
    author_name: pr.createdBy.displayName,
    author_email: pr.createdBy.uniqueName,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `${context.baseUrl}/${encodeURIComponent(projectName)}/_git/${encodeURIComponent(pr.repository.name)}/pullrequest/${pr.pullRequestId}`,
    is_public: false,
    access_control: [],
    metadata: {
      status: pr.status,
      sourceBranch: branchDisplayName(pr.sourceRefName),
      targetBranch: branchDisplayName(pr.targetRefName),
      repository: pr.repository.name,
      project: projectName,
      ...(reviewerNames.length > 0 && {
        reviewers: reviewerNames.join(", "),
      }),
      ...(labels.length > 0 && { labels: labels.join(", ") }),
      ...(pr.mergeStatus && { mergeStatus: pr.mergeStatus }),
    },
  };
}
