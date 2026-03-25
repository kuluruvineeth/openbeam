import type { MindtickleTransformContext } from "@openbeam/types/services/connectors/mindtickle";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { MindtickleCourse } from "../api/courses";
import { stripHtml } from "./utils";

function buildCourseContent(course: MindtickleCourse): string {
  const parts: string[] = [];

  if (course.description) {
    parts.push(stripHtml(course.description));
  }

  parts.push(`Status: ${course.status}`);

  if (course.category) {
    parts.push(`Category: ${course.category}`);
  }

  if (course.module_count > 0) {
    parts.push(`Modules: ${course.module_count}`);
  }

  if (course.duration_minutes > 0) {
    parts.push(`Duration: ${course.duration_minutes} minutes`);
  }

  if (course.tags.length > 0) {
    parts.push(`Tags: ${course.tags.join(", ")}`);
  }

  if (course.created_by) {
    parts.push(`Created by: ${course.created_by.name}`);
  }

  return parts.join("\n");
}

export async function transformCourse(
  course: MindtickleCourse,
  context: MindtickleTransformContext
): Promise<GenericDocument> {
  const title = course.name;
  const content = buildCourseContent(course);
  const metadata: GenericDocument["metadata"] = {
    status: course.status,
    category: course.category,
    moduleCount: String(course.module_count),
    durationMinutes: String(course.duration_minutes),
    ...(course.tags.length > 0 && {
      tags: course.tags.join(", "),
    }),
    ...(course.created_by && {
      createdBy: course.created_by.name,
    }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_course_${course.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: course.id,
    document_type: "course",
    document_subtype: course.status,
    title,
    content,
    created_at: new Date(course.created_at).getTime(),
    updated_at: new Date(course.updated_at).getTime(),
    source_type: "mindtickle",
    url: `https://app.mindtickle.com/courses/${course.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: course.created_by?.name,
    author_email: course.created_by?.email,
  };
}
