import type { LessonlyClient } from "../client";

export interface LessonlyPath {
  id: number;
  title: string;
  description: string | null;
  assignees_count: number;
  lessons: { id: number; title: string; position: number }[];
  links: { shareable: string };
  public: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface PathsResponse {
  type: string;
  paths: LessonlyPath[];
  total_paths: number;
  page: number;
  total_pages: number;
}

interface ListPathsOptions {
  updatedSince?: string;
}

export async function* listPaths(
  client: LessonlyClient,
  options: ListPathsOptions = {}
): AsyncGenerator<LessonlyPath[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
    };

    if (options.updatedSince) {
      params["filter[updated_at]"] = options.updatedSince;
    }

    const response = await client.get<PathsResponse>("/paths", params);

    if (response.paths.length > 0) {
      yield response.paths;
    }

    if (page >= response.total_pages) {
      break;
    }
    page += 1;
  }
}

export function getPath(
  client: LessonlyClient,
  pathId: number
): Promise<LessonlyPath> {
  return client.get<LessonlyPath>(`/paths/${pathId}`);
}
