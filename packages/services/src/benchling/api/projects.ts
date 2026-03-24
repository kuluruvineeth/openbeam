import type { BenchlingClient } from "../client";

export interface BenchlingProject {
  id: string;
  name: string;
  owner?: { id: string; name: string } | null;
  createdAt: string;
  modifiedAt: string;
  archiveRecord?: { reason: string } | null;
  webURL: string;
}

interface ProjectsResponse {
  projects: BenchlingProject[];
  nextToken?: string;
}

interface ListProjectsOptions {
  modifiedAt?: string;
}

export async function* listProjects(
  client: BenchlingClient,
  options: ListProjectsOptions = {}
): AsyncGenerator<BenchlingProject[], void, undefined> {
  let nextToken: string | undefined;

  while (true) {
    const params: Record<string, string> = {
      pageSize: "100",
      sort: "modifiedAt:asc",
    };

    if (nextToken) {
      params.nextToken = nextToken;
    }

    if (options.modifiedAt) {
      params["modifiedAt.gte"] = options.modifiedAt;
    }

    const response = await client.get<ProjectsResponse>("/projects", params);

    if (response.projects.length > 0) {
      yield response.projects;
    }

    if (!response.nextToken) {
      break;
    }
    nextToken = response.nextToken;
  }
}
