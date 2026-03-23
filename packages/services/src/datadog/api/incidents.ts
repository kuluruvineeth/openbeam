import type { DatadogClient } from "../client";

export interface DatadogIncident {
  id: string;
  type: "incidents";
  attributes: {
    title: string;
    severity: string;
    state: string;
    detection_method: string;
    customer_impact_scope: string | null;
    customer_impact_start: string | null;
    customer_impact_end: string | null;
    customer_impacted: boolean;
    created: string;
    modified: string;
    resolved: string | null;
    fields?: Record<
      string,
      {
        type: string;
        value: unknown;
      }
    >;
  };
  relationships?: {
    commander_user?: {
      data: { id: string; type: string } | null;
    };
    created_by_user?: {
      data: { id: string; type: string } | null;
    };
  };
}

interface IncidentListResponse {
  data: DatadogIncident[];
  meta?: {
    pagination?: {
      offset: number;
      size: number;
      next_offset?: number;
    };
  };
  included?: Array<{
    id: string;
    type: string;
    attributes: {
      name?: string;
      email?: string;
      handle?: string;
    };
  }>;
}

export async function* listIncidents(
  client: DatadogClient,
  options: { pageSize?: number } = {}
): AsyncGenerator<
  { incidents: DatadogIncident[]; users: Map<string, string> },
  void,
  undefined
> {
  const { pageSize = 100 } = options;
  let offset = 0;

  while (true) {
    const response = await client.get<IncidentListResponse>(
      "/api/v2/incidents",
      {
        "page[size]": String(pageSize),
        "page[offset]": String(offset),
        include: "commander_user,created_by_user",
      }
    );

    const incidents = response.data ?? [];
    const users = new Map<string, string>();
    for (const included of response.included ?? []) {
      if (included.type === "users" && included.attributes.name) {
        users.set(included.id, included.attributes.name);
      }
    }

    if (incidents.length > 0) {
      yield { incidents, users };
    }

    const nextOffset = response.meta?.pagination?.next_offset;
    if (!nextOffset || incidents.length < pageSize) {
      break;
    }

    offset = nextOffset;
  }
}
