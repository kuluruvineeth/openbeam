import type { DoceboTransformContext } from "@openbeam/types/services/connectors/docebo";
import type { GenericDocument } from "@openbeam/vespa";
import type { DoceboCourse } from "../api/courses";
import { buildDoceboUrl } from "./utils";

export function transformDoceboCourse(
  course: DoceboCourse,
  context: DoceboTransformContext
): GenericDocument {
  const parts = [
    course.description || null,
    course.type ? `Type: ${course.type}` : null,
    course.status ? `Status: ${course.status}` : null,
    course.category?.name ? `Category: ${course.category.name}` : null,
    course.duration ? `Duration: ${course.duration} minutes` : null,
    course.language ? `Language: ${course.language}` : null,
    course.enrollment_count ? `Enrollments: ${course.enrollment_count}` : null,
    course.code ? `Code: ${course.code}` : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_course_${course.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(course.id),
    document_type: "course",
    document_subtype: course.type,
    title: course.name,
    content: parts.join(" — "),
    created_at: new Date(course.date_creation).getTime(),
    updated_at: new Date(course.date_last_updated).getTime(),
    url: buildDoceboUrl(context.instanceUrl, "course", course.id),
    is_public: false,
    access_control: [],
    metadata: {
      ...(course.code && { courseCode: course.code }),
      ...(course.type && { courseType: course.type }),
      ...(course.status && { status: course.status }),
      ...(course.category?.name && { category: course.category.name }),
      ...(course.duration && { duration: String(course.duration) }),
      ...(course.language && { language: course.language }),
    },
  };
}
