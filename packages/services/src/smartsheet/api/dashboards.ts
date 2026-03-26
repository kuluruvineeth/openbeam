import type { SmartsheetClient } from "../client";

export interface SmartsheetDashboardWidget {
  id: number;
  type: string;
  title?: string;
}

export interface SmartsheetDashboard {
  id: number;
  name: string;
  accessLevel: string;
  permalink: string;
  createdAt: string;
  modifiedAt: string;
  owner?: string;
  ownerId?: number;
  widgets?: SmartsheetDashboardWidget[];
}

interface DashboardListResponse {
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  data: SmartsheetDashboard[];
}

export async function* listDashboards(
  client: SmartsheetClient,
  options: { modifiedSince?: string; pageSize?: number } = {}
): AsyncGenerator<SmartsheetDashboard[], void, undefined> {
  const { modifiedSince, pageSize = 100 } = options;
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      pageSize: String(pageSize),
    };
    if (modifiedSince) {
      params.modifiedSince = modifiedSince;
    }

    const response = await client.get<DashboardListResponse>("/sights", params);
    const dashboards = response.data ?? [];

    if (dashboards.length > 0) {
      yield dashboards;
    }

    if (page >= response.totalPages || dashboards.length < pageSize) {
      break;
    }

    page += 1;
  }
}

export function getDashboard(
  client: SmartsheetClient,
  dashboardId: number
): Promise<SmartsheetDashboard> {
  return client.get<SmartsheetDashboard>(`/sights/${dashboardId}`);
}
