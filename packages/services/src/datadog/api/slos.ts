import type { DatadogClient } from "../client";

export interface DatadogSlo {
  id: string;
  name: string;
  description: string | null;
  type: string;
  tags: string[];
  thresholds: Array<{
    timeframe: string;
    target: number;
    target_display: string;
    warning?: number;
    warning_display?: string;
  }>;
  query?: {
    numerator: string;
    denominator: string;
  };
  monitor_ids?: number[];
  creator: {
    email: string;
    handle: string;
    name: string | null;
  };
  created_at: number;
  modified_at: number;
  overall_status: Array<{
    status: string;
    error_budget_remaining?: number;
    sli_value?: number;
    timeframe: string;
  }>;
}

interface SloListResponse {
  data: DatadogSlo[];
  metadata?: {
    page?: {
      total_count: number;
      total_filtered_count: number;
    };
  };
}

export async function* listSlos(
  client: DatadogClient,
  options: { pageSize?: number } = {}
): AsyncGenerator<DatadogSlo[], void, undefined> {
  const { pageSize = 100 } = options;
  let offset = 0;

  while (true) {
    const response = await client.get<SloListResponse>("/api/v1/slo", {
      limit: String(pageSize),
      offset: String(offset),
    });

    const slos = response.data ?? [];
    if (slos.length > 0) {
      yield slos;
    }

    if (slos.length < pageSize) {
      break;
    }

    offset += slos.length;
  }
}
