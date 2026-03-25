import type { LessonlyTransformContext } from "@openbeam/types/services/connectors/lessonly";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { LessonlyPath } from "../api/paths";
import { buildLessonlyUrl, stripHtml } from "./utils";

function buildPathContent(path: LessonlyPath): string {
  const parts: string[] = [];

  if (path.description) {
    parts.push(stripHtml(path.description));
  }

  if (path.lessons.length > 0) {
    const lessonList = path.lessons
      .sort((a, b) => a.position - b.position)
      .map((l, i) => `${i + 1}. ${l.title}`)
      .join("\n");
    parts.push(`Lessons:\n${lessonList}`);
  }

  if (path.assignees_count > 0) {
    parts.push(`Assignees: ${path.assignees_count}`);
  }

  return parts.join("\n");
}

export async function transformPath(
  path: LessonlyPath,
  context: LessonlyTransformContext
): Promise<GenericDocument> {
  const title = path.title;
  const content = buildPathContent(path);
  const url = path.links?.shareable
    ? path.links.shareable
    : buildLessonlyUrl(context.subdomain, `/paths/${path.id}`);

  const metadata: GenericDocument["metadata"] = {
    lessonCount: String(path.lessons.length),
    assigneesCount: String(path.assignees_count),
    ...(path.public && { isPublic: "true" }),
    ...(path.archived_at && { archived: "true" }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_path_${path.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(path.id),
    document_type: "project",
    document_subtype: "learning_path",
    title,
    content,
    created_at: new Date(path.created_at).getTime(),
    updated_at: new Date(path.updated_at).getTime(),
    source_type: "lessonly",
    url,
    is_public: path.public,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
