import type { AmplitudeClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface GetChartAnnotationsParams {
  chartId: number;
}

export async function getChartAnnotations(
  client: AmplitudeClient,
  params: GetChartAnnotationsParams
): Promise<ActionResult> {
  try {
    await client.get<{
      data?: { id: string }[];
    }>(`/chart/${params.chartId}/annotations`);

    return {
      success: true,
      id: String(params.chartId),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get chart annotations",
    };
  }
}
