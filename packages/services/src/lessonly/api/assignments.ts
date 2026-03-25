import type { LessonlyClient } from "../client";

export interface LessonlyAssignment {
  id: number;
  assignee_id: number;
  assignable_id: number;
  assignable_type: "Lesson" | "Path";
  due_by: string | null;
  reassigned_at: string | null;
  completed_at: string | null;
  score: number | null;
  status: "Incomplete" | "Complete" | "Overdue";
  started_at: string | null;
  updated_at: string;
  ext_uid: string | null;
  created_at: string;
}

interface AssignmentsResponse {
  type: string;
  assignments: LessonlyAssignment[];
  total_assignments: number;
  page: number;
  total_pages: number;
}

interface ListAssignmentsOptions {
  updatedSince?: string;
}

export async function* listAssignments(
  client: LessonlyClient,
  options: ListAssignmentsOptions = {}
): AsyncGenerator<LessonlyAssignment[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
    };

    if (options.updatedSince) {
      params["filter[updated_at]"] = options.updatedSince;
    }

    const response = await client.get<AssignmentsResponse>(
      "/assignments",
      params
    );

    if (response.assignments.length > 0) {
      yield response.assignments;
    }

    if (page >= response.total_pages) {
      break;
    }
    page += 1;
  }
}
