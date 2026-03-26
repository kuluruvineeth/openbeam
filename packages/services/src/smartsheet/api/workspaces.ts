import type { SmartsheetClient } from "../client";

export interface SmartsheetWorkspace {
  id: number;
  name: string;
  accessLevel: string;
  permalink: string;
  sheets?: { id: number; name: string }[];
  reports?: { id: number; name: string }[];
  sights?: { id: number; name: string }[];
  folders?: { id: number; name: string }[];
}

interface WorkspaceListResponse {
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  data: SmartsheetWorkspace[];
}

export async function* listWorkspaces(
  client: SmartsheetClient,
  options: { pageSize?: number } = {}
): AsyncGenerator<SmartsheetWorkspace[], void, undefined> {
  const { pageSize = 100 } = options;
  let page = 1;

  while (true) {
    const response = await client.get<WorkspaceListResponse>("/workspaces", {
      page: String(page),
      pageSize: String(pageSize),
    });
    const workspaces = response.data ?? [];

    if (workspaces.length > 0) {
      yield workspaces;
    }

    if (page >= response.totalPages || workspaces.length < pageSize) {
      break;
    }

    page += 1;
  }
}

export function getWorkspace(
  client: SmartsheetClient,
  workspaceId: number
): Promise<SmartsheetWorkspace> {
  return client.get<SmartsheetWorkspace>(`/workspaces/${workspaceId}`);
}
