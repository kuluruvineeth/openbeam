import type { GitLabClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: number;
  url?: string;
  error?: string;
}

export async function createIssue(
  client: GitLabClient,
  projectId: number,
  params: { title: string; description?: string; labels?: string }
): Promise<ActionResult> {
  try {
    const result = await client.post<{
      id: number;
      iid: number;
      web_url: string;
    }>(`/projects/${projectId}/issues`, params);
    return { success: true, id: result.iid, url: result.web_url };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create issue",
    };
  }
}

export async function updateIssue(
  client: GitLabClient,
  projectId: number,
  issueIid: number,
  params: { title?: string; description?: string; state_event?: string }
): Promise<ActionResult> {
  try {
    const result = await client.put<{
      id: number;
      iid: number;
      web_url: string;
    }>(`/projects/${projectId}/issues/${issueIid}`, params);
    return { success: true, id: result.iid, url: result.web_url };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update issue",
    };
  }
}

export async function addIssueNote(
  client: GitLabClient,
  projectId: number,
  issueIid: number,
  body: string
): Promise<ActionResult> {
  try {
    const result = await client.post<{ id: number }>(
      `/projects/${projectId}/issues/${issueIid}/notes`,
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
