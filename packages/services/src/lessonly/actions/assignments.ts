import type { LessonlyClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateAssignmentParams {
  assigneeId: number;
  assignableId: number;
  assignableType: "Lesson" | "Path";
  dueBy?: string;
}

export async function createAssignment(
  client: LessonlyClient,
  params: CreateAssignmentParams
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {
      assignee_id: params.assigneeId,
      assignable_id: params.assignableId,
      assignable_type: params.assignableType,
      ...(params.dueBy && { due_by: params.dueBy }),
    };

    const result = await client.post<{ id: number }>("/assignments", body);

    return {
      success: true,
      id: String(result.id),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create assignment",
    };
  }
}
