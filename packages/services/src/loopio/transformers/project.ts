import type { LoopioTransformContext } from "@openbeam/types/services/connectors/loopio";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { LoopioProject } from "../api/projects";
import { stripHtml } from "./utils";

function buildProjectContent(project: LoopioProject): string {
  const parts: string[] = [];

  if (project.description) {
    parts.push(stripHtml(project.description));
  }

  parts.push(`Status: ${project.status}`);

  if (project.deadline) {
    parts.push(`Deadline: ${project.deadline}`);
  }

  if (project.question_count > 0) {
    parts.push(`Questions: ${project.question_count}`);
  }

  if (project.tags.length > 0) {
    parts.push(`Tags: ${project.tags.join(", ")}`);
  }

  if (project.owner) {
    parts.push(`Owner: ${project.owner.name}`);
  }

  return parts.join("\n");
}

export async function transformProject(
  project: LoopioProject,
  context: LoopioTransformContext
): Promise<GenericDocument> {
  const title = project.name;
  const content = buildProjectContent(project);
  const metadata: GenericDocument["metadata"] = {
    status: project.status,
    questionCount: String(project.question_count),
    ...(project.deadline && { deadline: project.deadline }),
    ...(project.tags.length > 0 && {
      tags: project.tags.join(", "),
    }),
    ...(project.owner && {
      owner: project.owner.name,
    }),
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
    external_id: project.id,
    document_type: "project",
    document_subtype: project.status,
    title,
    content,
    created_at: new Date(project.created_at).getTime(),
    updated_at: new Date(project.updated_at).getTime(),
    source_type: "loopio",
    url: `https://app.loopio.com/projects/${project.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: project.owner?.name,
    author_email: project.owner?.email,
  };
}
