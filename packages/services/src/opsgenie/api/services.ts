import type { OpsGenieClient } from "../client";

export interface OpsGenieService {
  id: string;
  name: string;
  description?: string;
  teamId?: string;
  teamName?: string;
  tags?: string[];
  isExternal?: boolean;
}

interface ServiceListResponse {
  data: OpsGenieService[];
  paging?: {
    next?: string;
    first?: string;
    last?: string;
  };
}

export async function* listServices(
  client: OpsGenieClient,
  limit = 100
): AsyncGenerator<OpsGenieService[], void, undefined> {
  let offset = 0;
  const maxOffset = 9900;

  while (offset <= maxOffset) {
    const response = await client.get<ServiceListResponse>("/services", {
      limit: String(limit),
      offset: String(offset),
    });
    const services = response.data ?? [];

    if (services.length > 0) {
      yield services;
    }

    if (services.length < limit || !response.paging?.next) {
      break;
    }

    offset += limit;
  }
}
