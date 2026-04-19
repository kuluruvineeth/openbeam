import { listProjects as listProjectsApi } from "../api/projects";
import type { AzureDevOpsClient } from "../client";

export type ProjectListResult = {
  success: boolean;
  projects?: Array<{
    id: string;
    name: string;
    state: string;
    url: string;
    description?: string;
  }>;
  error?: string;
};

export async function listProjects(
  client: AzureDevOpsClient,
  options: { limit?: number } = {}
): Promise<ProjectListResult> {
  try {
    const limit = Math.max(1, Math.min(options.limit ?? 100, 500));
    const raw = await listProjectsApi(client);
    return {
      success: true,
      projects: raw.slice(0, limit).map((p) => ({
        id: p.id,
        name: p.name,
        state: p.state,
        url: p.url,
        description: p.description,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list projects",
    };
  }
}
