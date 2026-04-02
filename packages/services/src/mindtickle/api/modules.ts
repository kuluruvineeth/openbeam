import type { MindtickleClient } from "../client";

export interface MindtickleModule {
  id: string;
  title: string;
  description: string;
  content: string;
  module_type: string;
  course_id: string;
  course_name: string;
  duration_minutes: number;
  order: number;
  created_at: string;
  updated_at: string;
}

interface ModulesResponse {
  modules: MindtickleModule[];
  pagination: {
    total_records: number;
    total_pages: number;
    current_page: number;
  };
}

interface ListModulesOptions {
  courseId?: string;
  updatedSince?: string;
}

export async function* listModules(
  client: MindtickleClient,
  options: ListModulesOptions = {}
): AsyncGenerator<MindtickleModule[], void, undefined> {
  let page = 1;
  const basePath = options.courseId
    ? `/openapi/courses/${options.courseId}/modules`
    : "/openapi/module";

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      limit: "100",
    };

    if (options.updatedSince) {
      params.updated_after = options.updatedSince;
    }

    const response = await client.get<ModulesResponse>(basePath, params);

    if (response.modules.length > 0) {
      yield response.modules;
    }

    if (page >= response.pagination.total_pages) {
      break;
    }
    page += 1;
  }
}
