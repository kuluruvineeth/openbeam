import type { DoceboTransformContext } from "@openbeam/types/services/connectors/docebo";
import type { GenericDocument } from "@openbeam/vespa";
import type { DoceboEnrollment } from "../api/enrollments";
import { buildDoceboUrl } from "./utils";

export function transformDoceboEnrollment(
  enrollment: DoceboEnrollment,
  context: DoceboTransformContext
): GenericDocument {
  const parts = [
    `User: ${enrollment.user_fullname || enrollment.username}`,
    `Course: ${enrollment.course_name}`,
    enrollment.status ? `Status: ${enrollment.status}` : null,
    enrollment.progress !== undefined
      ? `Progress: ${enrollment.progress}%`
      : null,
    enrollment.score !== null ? `Score: ${enrollment.score}` : null,
    enrollment.completion_date
      ? `Completed: ${enrollment.completion_date}`
      : null,
    enrollment.course_code ? `Code: ${enrollment.course_code}` : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_enrollment_${enrollment.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(enrollment.id),
    document_type: "enrollment",
    document_subtype: enrollment.status,
    title: `${enrollment.user_fullname || enrollment.username} — ${enrollment.course_name}`,
    content: parts.join(" — "),
    created_at: new Date(enrollment.enrollment_date).getTime(),
    updated_at: new Date(enrollment.date_last_updated).getTime(),
    url: buildDoceboUrl(context.instanceUrl, "course", enrollment.course_id),
    author_name: enrollment.user_fullname || undefined,
    is_public: false,
    access_control: [],
    metadata: {
      ...(enrollment.status && { status: enrollment.status }),
      ...(enrollment.progress !== undefined && {
        progress: String(enrollment.progress),
      }),
      ...(enrollment.score !== null && { score: String(enrollment.score) }),
      ...(enrollment.course_name && { courseName: enrollment.course_name }),
      ...(enrollment.username && { username: enrollment.username }),
    },
  };
}
