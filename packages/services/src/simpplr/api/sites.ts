import type { SimpplrClient } from "../client";

export interface SimpplrSite {
  id: string;
  name: string;
  description?: string;
  siteType?: string;
  status?: string;
  memberCount?: number;
  url?: string;
  owner?: {
    id: string;
    displayName: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface SitesResponse {
  data: SimpplrSite[];
  total?: number;
  hasMore?: boolean;
}

interface ListSitesOptions {
  modifiedAfter?: string;
}

export async function* listSites(
  client: SimpplrClient,
  options: ListSitesOptions = {}
): AsyncGenerator<SimpplrSite[], void, undefined> {
  let offset = 0;
  const limit = 100;

  while (true) {
    const params: Record<string, string> = {
      offset: String(offset),
      limit: String(limit),
    };

    if (options.modifiedAfter) {
      params.modifiedAfter = options.modifiedAfter;
    }

    const response = await client.get<SitesResponse>("/sites", params);

    if (response.data.length > 0) {
      yield response.data;
    }

    if (response.data.length < limit) {
      break;
    }
    offset += limit;
  }
}
