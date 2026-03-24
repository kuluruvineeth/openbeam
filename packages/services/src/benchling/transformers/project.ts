import type { BenchlingTransformContext } from "@openbeam/types/services/connectors/benchling";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { BenchlingProject } from "../api/projects";

export async function transformProject(
  project: BenchlingProject,
  context: BenchlingTransformContext
): Promise<GenericDocument> {
  const title = project.name;
  const parts: string[] = [`Project: ${project.name}`];
  if (project.owner) {
    parts.push(`Owner: ${project.owner.name}`);
  }
  const content = parts.join("\n");

  const metadata: GenericDocument["metadata"] = {
    ...(project.owner && { owner: project.owner.name }),
    ...(project.archiveRecord && {
      archived: "true",
      archiveReason: project.archiveRecord.reason,
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
    document_type: "document",
    document_subtype: "project",
    title,
    content,
    created_at: new Date(project.createdAt).getTime(),
    updated_at: new Date(project.modifiedAt).getTime(),
    source_type: "benchling",
    url: project.webURL,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: project.owner?.name,
  };
}
