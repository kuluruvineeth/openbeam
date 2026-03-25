import type { LessonlyTransformContext } from "@openbeam/types/services/connectors/lessonly";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { LessonlyAssignment } from "../api/assignments";
import { buildLessonlyUrl } from "./utils";

function buildAssignmentContent(assignment: LessonlyAssignment): string {
  const parts: string[] = [];

  parts.push(`Type: ${assignment.assignable_type}`);
  parts.push(`Status: ${assignment.status}`);

  if (assignment.score !== null) {
    parts.push(`Score: ${assignment.score}`);
  }

  if (assignment.due_by) {
    parts.push(`Due: ${new Date(assignment.due_by).toLocaleDateString()}`);
  }

  if (assignment.completed_at) {
    parts.push(
      `Completed: ${new Date(assignment.completed_at).toLocaleDateString()}`
    );
  }

  return parts.join("\n");
}

export async function transformAssignment(
  assignment: LessonlyAssignment,
  context: LessonlyTransformContext
): Promise<GenericDocument> {
  const title = `${assignment.assignable_type} Assignment #${assignment.id}`;
  const content = buildAssignmentContent(assignment);
  const url = buildLessonlyUrl(
    context.subdomain,
    `/assignments/${assignment.id}`
  );

  const metadata: GenericDocument["metadata"] = {
    assigneeId: String(assignment.assignee_id),
    assignableType: assignment.assignable_type,
    assignableId: String(assignment.assignable_id),
    status: assignment.status,
    ...(assignment.score !== null && { score: String(assignment.score) }),
    ...(assignment.due_by && { dueDate: assignment.due_by }),
    ...(assignment.completed_at && { completedAt: assignment.completed_at }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_assignment_${assignment.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(assignment.id),
    document_type: "task",
    document_subtype: "assignment",
    title,
    content,
    created_at: new Date(assignment.created_at).getTime(),
    updated_at: new Date(assignment.updated_at).getTime(),
    source_type: "lessonly",
    url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
