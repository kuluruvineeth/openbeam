import type { DatadogClient } from "../client";

export interface DatadogMonitor {
  id: number;
  name: string;
  type: string;
  query: string;
  message: string;
  tags: string[];
  multi: boolean;
  overall_state: string;
  priority: number | null;
  creator: {
    email: string;
    handle: string;
    name: string | null;
  };
  created: string;
  modified: string;
  options?: {
    thresholds?: Record<string, number>;
    notify_no_data?: boolean;
    escalation_message?: string;
  };
  deleted: string | null;
}

interface MonitorListResponse extends Array<DatadogMonitor> {}

export async function* listMonitors(
  client: DatadogClient,
  options: { pageSize?: number } = {}
): AsyncGenerator<DatadogMonitor[], void, undefined> {
  const { pageSize = 100 } = options;
  let page = 0;

  while (true) {
    const response = await client.get<MonitorListResponse>("/api/v1/monitor", {
      page: String(page),
      page_size: String(pageSize),
    });

    if (response.length > 0) {
      yield response;
    }

    if (response.length < pageSize) {
      break;
    }

    page += 1;
  }
}

export function getMonitor(
  client: DatadogClient,
  monitorId: number
): Promise<DatadogMonitor> {
  return client.get<DatadogMonitor>(`/api/v1/monitor/${monitorId}`);
}
