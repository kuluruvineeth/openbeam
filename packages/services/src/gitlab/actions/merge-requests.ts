import type { GitLabClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: number;
  url?: string;
  error?: string;
}

export async function createMergeRequest(
  client: GitLabClient,
  projectId: number,
  params: {
    title: string;
    source_branch: string;
    target_branch: string;
    description?: string;
  }
): Promise<ActionResult> {
  try {
    const result = await client.post<{
      id: number;
      iid: number;
      web_url: string;
    }>(`/projects/${projectId}/merge_requests`, params);
    return { success: true, id: result.iid, url: result.web_url };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create merge request",
    };
  }
}

export async function addMergeRequestNote(
  client: GitLabClient,
  projectId: number,
  mrIid: number,
  body: string
): Promise<ActionResult> {
  try {
    const result = await client.post<{ id: number }>(
      `/projects/${projectId}/merge_requests/${mrIid}/notes`,
      { body }
    );
    return { success: true, id: result.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add note",
    };
  }
}
