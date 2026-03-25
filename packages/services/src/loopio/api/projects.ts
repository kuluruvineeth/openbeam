import type { LoopioClient } from "../client";

export interface LoopioProject {
  id: string;
  name: string;
  description: string;
  status: string;
  deadline: string | null;
  owner: {
    id: string;
    name: string;
    email: string;
  } | null;
  question_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface ProjectsResponse {
  projects: LoopioProject[];
  pagination: {
    total_records: number;
    total_pages: number;
    current_page: number;
  };
}

interface ListProjectsOptions {
  updatedSince?: string;
}

export async function* listProjects(
  client: LoopioClient,
  options: ListProjectsOptions = {}
): AsyncGenerator<LoopioProject[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      per_page: "100",
    };

    if (options.updatedSince) {
      params.updated_after = options.updatedSince;
    }

    const response = await client.get<ProjectsResponse>("/projects", params);

    if (response.projects.length > 0) {
      yield response.projects;
    }

    if (page >= response.pagination.total_pages) {
      break;
    }
    page += 1;
  }
}
