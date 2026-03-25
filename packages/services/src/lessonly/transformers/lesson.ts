import type { LessonlyTransformContext } from "@openbeam/types/services/connectors/lessonly";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { LessonlyLesson } from "../api/lessons";
import { buildLessonlyUrl, stripHtml } from "./utils";

function buildLessonContent(lesson: LessonlyLesson): string {
  const parts: string[] = [];

  if (lesson.description) {
    parts.push(stripHtml(lesson.description));
  }

  if (lesson.tags.length > 0) {
    parts.push(`Tags: ${lesson.tags.map((t) => t.name).join(", ")}`);
  }

  if (lesson.assignees_count > 0) {
    parts.push(`Assignees: ${lesson.assignees_count}`);
  }

  if (lesson.completed_count > 0) {
    parts.push(`Completions: ${lesson.completed_count}`);
  }

  if (lesson.retake_score > 0) {
    parts.push(`Retake Score: ${lesson.retake_score}`);
  }

  return parts.join("\n");
}

export async function transformLesson(
  lesson: LessonlyLesson,
  context: LessonlyTransformContext
): Promise<GenericDocument> {
  const title = lesson.title;
  const content = buildLessonContent(lesson);
  const url = lesson.links?.shareable
    ? lesson.links.shareable
    : buildLessonlyUrl(context.subdomain, `/lessons/${lesson.id}`);

  const metadata: GenericDocument["metadata"] = {
    assigneesCount: String(lesson.assignees_count),
    completedCount: String(lesson.completed_count),
    ...(lesson.tags.length > 0 && {
      tags: lesson.tags.map((t) => t.name).join(", "),
    }),
    ...(lesson.retake_score > 0 && {
      retakeScore: String(lesson.retake_score),
    }),
    ...(lesson.public && { isPublic: "true" }),
    ...(lesson.archived_at && { archived: "true" }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_lesson_${lesson.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(lesson.id),
    document_type: "document",
    document_subtype: "lesson",
    title,
    content,
    created_at: new Date(lesson.created_at).getTime(),
    updated_at: new Date(lesson.updated_at).getTime(),
    source_type: "lessonly",
    url,
    is_public: lesson.public,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
