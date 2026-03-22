import type {
  GitLabProject,
  GitLabTransformContext,
} from "@openbeam/types/services/connectors/gitlab";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildProjectContent(project: GitLabProject): string {
  const parts: string[] = [];

  if (project.description) {
    parts.push(project.description);
  }

  parts.push(`Visibility: ${project.visibility}`);

  if (project.default_branch) {
    parts.push(`Default branch: ${project.default_branch}`);
  }

  if (project.topics?.length) {
    parts.push(`Topics: ${project.topics.join(", ")}`);
  }

  if (project.star_count) {
    parts.push(`Stars: ${project.star_count}`);
  }

  if (project.forks_count) {
    parts.push(`Forks: ${project.forks_count}`);
  }

  return parts.join("\n");
}

export async function transformProject(
  project: GitLabProject,
  context: GitLabTransformContext
): Promise<GenericDocument> {
  const title = project.path_with_namespace;
  const content = buildProjectContent(project);
  const isPublic = project.visibility === "public";

  const metadata = {
    projectId: project.id,
    visibility: project.visibility as string,
    defaultBranch: project.default_branch,
    topics: JSON.stringify(project.topics ?? []),
    starCount: project.star_count ?? 0,
    forksCount: project.forks_count ?? 0,
    openIssuesCount: project.open_issues_count ?? 0,
    archived: project.archived ?? false,
    ...(project.namespace && { namespace: project.namespace.full_path }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_project_${project.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(project.id),
    document_type: "project",
    document_subtype: project.visibility,
    title,
    content,
    created_at: new Date(project.created_at).getTime(),
    updated_at: new Date(project.last_activity_at).getTime(),
    source_id: project.path_with_namespace,
    source_type: "gitlab",
    source_name: project.namespace?.full_path,
    url: project.web_url,
    is_public: isPublic,
    access_control: [`team:${context.teamId}`],
    labels: project.topics ?? [],
    metadata,
    checksum,
  };
}
