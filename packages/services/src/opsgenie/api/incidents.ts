import type { OpsGenieClient } from "../client";

export interface OpsGenieIncident {
  id: string;
  tinyId: string;
  message: string;
  status: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  priority: string;
  ownerTeam?: string;
  responders?: {
    id: string;
    type: string;
    name?: string;
  }[];
  impactedServices?: string[];
  description?: string;
  extraProperties?: Record<string, string>;
}

interface IncidentListResponse {
  data: OpsGenieIncident[];
  paging?: {
    next?: string;
    first?: string;
    last?: string;
  };
}

interface ListIncidentsOptions {
  query?: string;
  sort?: string;
  order?: string;
  limit?: number;
}

export async function* listIncidents(
  client: OpsGenieClient,
  options: ListIncidentsOptions = {}
): AsyncGenerator<OpsGenieIncident[], void, undefined> {
  const { query, sort, order, limit = 50 } = options;
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

    const response = await client.get<IncidentListResponse>(
      "/incidents",
      params
    );
    const incidents = response.data ?? [];

    if (incidents.length > 0) {
      yield incidents;
    }

    if (incidents.length < limit || !response.paging?.next) {
      break;
    }

    offset += limit;
  }
}
