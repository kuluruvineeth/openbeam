import type { OpsGenieClient } from "../client";

export interface OpsGenieAlert {
  id: string;
  tinyId: string;
  alias?: string;
  message: string;
  status: string;
  acknowledged: boolean;
  isSeen: boolean;
  tags: string[];
  snoozed: boolean;
  count: number;
  lastOccurredAt: string;
  createdAt: string;
  updatedAt: string;
  source?: string;
  owner?: string;
  priority: string;
  responders?: {
    id: string;
    type: string;
    name?: string;
  }[];
  integration?: {
    id: string;
    name: string;
    type: string;
  };
  report?: {
    ackTime?: number;
    closeTime?: number;
    acknowledgedBy?: string;
    closedBy?: string;
  };
  description?: string;
  details?: Record<string, string>;
}

interface AlertListResponse {
  data: OpsGenieAlert[];
  paging?: {
    next?: string;
    first?: string;
    last?: string;
  };
}

interface AlertDetailResponse {
  data: OpsGenieAlert & {
    description?: string;
    details?: Record<string, string>;
  };
}

interface ListAlertsOptions {
  query?: string;
  sort?: string;
  order?: string;
  limit?: number;
}

export async function* listAlerts(
  client: OpsGenieClient,
  options: ListAlertsOptions = {}
): AsyncGenerator<OpsGenieAlert[], void, undefined> {
  const { query, sort, order, limit = 100 } = options;
  let offset = 0;
  const maxOffset = 9900;

  while (offset <= maxOffset) {
    const params: Record<string, string> = {
      limit: String(limit),
      offset: String(offset),
    };
    if (query) {
      params.query = query;
    }
    if (sort) {
      params.sort = sort;
    }
    if (order) {
      params.order = order;
    }

    const response = await client.get<AlertListResponse>("/alerts", params);
    const alerts = response.data ?? [];

    if (alerts.length > 0) {
      yield alerts;
    }

    if (alerts.length < limit || !response.paging?.next) {
      break;
    }

    offset += limit;
  }
}

export async function getAlertDetail(
  client: OpsGenieClient,
  alertId: string
): Promise<OpsGenieAlert> {
  const response = await client.get<AlertDetailResponse>(`/alerts/${alertId}`, {
    identifierType: "id",
  });
  return response.data;
}
