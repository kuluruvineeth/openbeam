import type { AmplitudeClient } from "../client";

export interface AmplitudeDashboard {
  id: number;
  name: string;
  description?: string;
  owner?: string;
  lastModified?: string;
  createdAt?: string;
  isPublic?: boolean;
  charts?: { chartId: number; name?: string }[];
  projectId?: number;
}

interface DashboardListResponse {
  dashboards?: AmplitudeDashboard[];
}

interface DashboardDetailResponse {
  dashboard: AmplitudeDashboard;
}

export async function listDashboards(
  client: AmplitudeClient
): Promise<AmplitudeDashboard[]> {
  const response = await client.get<DashboardListResponse>("/dashboard");
  return response.dashboards ?? [];
}

export async function getDashboardDetail(
  client: AmplitudeClient,
  dashboardId: number
): Promise<AmplitudeDashboard> {
  const response = await client.get<DashboardDetailResponse>(
    `/dashboard/${dashboardId}`
  );
  return response.dashboard;
}
