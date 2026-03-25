import type { MindtickleClient } from "../client";

export interface MindtickleCourse {
  id: string;
  name: string;
  description: string;
  status: string;
  category: string;
  module_count: number;
  duration_minutes: number;
  created_by: {
    id: string;
    name: string;
    email: string;
  } | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface CoursesResponse {
  courses: MindtickleCourse[];
  pagination: {
    total_records: number;
    total_pages: number;
    current_page: number;
  };
}

interface ListCoursesOptions {
  updatedSince?: string;
}

export async function* listCourses(
  client: MindtickleClient,
  options: ListCoursesOptions = {}
): AsyncGenerator<MindtickleCourse[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      limit: "100",
    };

    if (options.updatedSince) {
      params.updated_after = options.updatedSince;
    }

    const response = await client.get<CoursesResponse>("/courses", params);

    if (response.courses.length > 0) {
      yield response.courses;
    }

    if (page >= response.pagination.total_pages) {
      break;
    }
    page += 1;
  }
}
