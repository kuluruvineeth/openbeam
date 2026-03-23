import type { DatadogClient } from "../client";

export interface DatadogDashboardSummary {
  id: string;
  title: string;
  description: string | null;
  layout_type: string;
  url: string;
  author_handle: string;
  author_name: string | null;
  created_at: string;
  modified_at: string;
  is_read_only: boolean;
}

export interface DatadogDashboard extends DatadogDashboardSummary {
  widgets: DatadogWidget[];
}

export interface DatadogWidget {
  id?: number;
  definition: {
    type: string;
    title?: string;
    requests?: unknown[];
    widgets?: DatadogWidget[];
  };
}

interface DashboardListResponse {
  dashboards: DatadogDashboardSummary[];
  total: number;
}

export async function* listDashboards(
  client: DatadogClient,
  options: { pageSize?: number } = {}
): AsyncGenerator<DatadogDashboardSummary[], void, undefined> {
  const { pageSize = 100 } = options;
  let start = 0;

  while (true) {
    const response = await client.get<DashboardListResponse>(
      "/api/v1/dashboard",
      {
        start: String(start),
        count: String(pageSize),
      }
    );

    const dashboards = response.dashboards ?? [];
    if (dashboards.length > 0) {
      yield dashboards;
    }

    start += dashboards.length;
    if (dashboards.length < pageSize || start >= response.total) {
      break;
    }
  }
}

export function getDashboard(
  client: DatadogClient,
  dashboardId: string
): Promise<DatadogDashboard> {
  return client.get<DatadogDashboard>(`/api/v1/dashboard/${dashboardId}`);
}
