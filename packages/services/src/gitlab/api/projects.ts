import {
  type GitLabProject,
  GitLabProjectSchema,
} from "@openbeam/types/services/connectors/gitlab";
import type { GitLabClient } from "../client";

export async function* getAllProjects(
  client: GitLabClient,
  options: {
    membership?: boolean;
    visibility?: string;
  } = {}
): AsyncGenerator<GitLabProject> {
  const query: Record<string, string> = {
    membership: String(options.membership ?? true),
    order_by: "last_activity_at",
    sort: "desc",
    per_page: "100",
  };

  if (options.visibility) {
    query.visibility = options.visibility;
  }

  for await (const page of client.paginate<unknown>("/projects", query)) {
    for (const raw of page) {
      const parsed = GitLabProjectSchema.safeParse(raw);
      if (parsed.success) {
        yield parsed.data;
      }
    }
  }
}

export async function getProject(
  client: GitLabClient,
  projectId: number
): Promise<GitLabProject> {
  const raw = await client.get<unknown>(`/projects/${projectId}`);
  return GitLabProjectSchema.parse(raw);
}
