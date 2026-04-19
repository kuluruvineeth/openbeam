import type { GitLabClient } from "../client";

export type ProjectListResult = {
  success: boolean;
  projects?: Array<{
    id: number;
    name: string;
    path: string;
    visibility: string;
  }>;
  error?: string;
};

export async function listProjects(
  client: GitLabClient,
  options: { membership?: boolean; visibility?: string; limit?: number } = {}
): Promise<ProjectListResult> {
  try {
    const limit = Math.max(1, Math.min(options.limit ?? 50, 100));
    const query: Record<string, string> = {
      membership: String(options.membership ?? true),
      order_by: "last_activity_at",
      sort: "desc",
      per_page: String(limit),
    };
    if (options.visibility) {
      query.visibility = options.visibility;
    }

    const raw = await client.get<
      Array<{
        id: number;
        name: string;
        path_with_namespace: string;
        visibility: string;
      }>
    >("/projects", query);

    return {
      success: true,
      projects: raw.map((p) => ({
        id: p.id,
        name: p.name,
        path: p.path_with_namespace,
        visibility: p.visibility,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list projects",
    };
  }
}
