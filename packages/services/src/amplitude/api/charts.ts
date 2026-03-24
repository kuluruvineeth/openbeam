import type { AmplitudeClient } from "../client";

export interface AmplitudeChart {
  id: number;
  name: string;
  chartType: string;
  description?: string;
  owner?: string;
  lastModified?: string;
  createdAt?: string;
  isPublic?: boolean;
  projectId?: number;
}

interface ChartListResponse {
  charts?: AmplitudeChart[];
}

interface ChartDetailResponse {
  chart: AmplitudeChart;
}

export async function listCharts(
  client: AmplitudeClient
): Promise<AmplitudeChart[]> {
  const response = await client.get<ChartListResponse>("/chart");
  return response.charts ?? [];
}

export async function getChartDetail(
  client: AmplitudeClient,
  chartId: number
): Promise<AmplitudeChart> {
  const response = await client.get<ChartDetailResponse>(`/chart/${chartId}`);
  return response.chart;
}
