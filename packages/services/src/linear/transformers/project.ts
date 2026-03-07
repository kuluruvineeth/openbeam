import type {
  LinearProject,
  LinearTransformContext,
} from "@openbeam/types/services/connectors/linear";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildProjectDocumentId(
  connectorId: string,
  projectId: string
): string {
  return `${connectorId}_project_${projectId}`;
}

function buildProjectContent(project: LinearProject): string {
  const parts: string[] = [];

  if (project.description) {
    parts.push(project.description);
  }

  parts.push(`Status: ${project.state}`);
  parts.push(`Progress: ${Math.round(project.progress * 100)}%`);

  if (project.lead) {
    parts.push(`Lead: ${project.lead.displayName}`);
  }

  const teams = project.teams.nodes.map((t) => t.name).join(", ");
  if (teams) {
    parts.push(`Teams: ${teams}`);
  }

  if (project.targetDate) {
    parts.push(`Target: ${project.targetDate}`);
  }

  if (project.startedAt) {
    parts.push(`Started: ${project.startedAt}`);
  }

  if (project.completedAt) {
    parts.push(`Completed: ${project.completedAt}`);
  }

  return parts.join("\n");
}

function buildProjectMetadata(
  project: LinearProject
): GenericDocument["metadata"] {
  return {
    projectId: project.id,
    state: project.state,
    progress: project.progress,
    ...(project.icon && { icon: project.icon }),
    ...(project.color && { color: project.color }),
    ...(project.lead && { leadId: project.lead.id }),
    ...(project.targetDate && { targetDate: project.targetDate }),
    ...(project.startedAt && { startedAt: project.startedAt }),
    ...(project.completedAt && { completedAt: project.completedAt }),
    ...(project.canceledAt && { canceledAt: project.canceledAt }),
    ...(project.archivedAt && { archivedAt: project.archivedAt }),
    teams: project.teams.nodes.map((t) => ({
      id: t.id,
      name: t.name,
      key: t.key,
    })),
  };
}

export async function transformProject(
  project: LinearProject,
  context: LinearTransformContext
): Promise<GenericDocument> {
  const content = buildProjectContent(project);
  const leadId = project.lead?.id;
  const leadName = leadId
    ? (context.userLookup?.getName(leadId) ?? project.lead?.displayName)
    : undefined;
  const leadAvatar = leadId
    ? (context.userLookup?.getAvatar(leadId) ?? project.lead?.avatarUrl)
    : undefined;

  const metadata = buildProjectMetadata(project);

  const checksum = await calculateDocumentChecksum({
    title: project.name,
    content,
    metadata,
  });

  return {
    id: buildProjectDocumentId(context.connectorId, project.id),
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: project.id,
    document_type: "project",
    document_subtype: project.state,
    title: project.name,
    content,
    author_id: leadId,
    author_name: leadName,
    author_avatar_url: leadAvatar ?? undefined,
    created_at: new Date(project.createdAt).getTime(),
    updated_at: new Date(project.updatedAt).getTime(),
    source_id: context.workspaceId,
    source_type: "linear",
    source_name: context.organizationName,
    url: project.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformProjects(
  projects: LinearProject[],
  context: LinearTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(
    projects.map((project) => transformProject(project, context))
  );
}
