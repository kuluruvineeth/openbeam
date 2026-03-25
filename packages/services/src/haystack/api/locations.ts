import type { HaystackClient } from "../client";

export interface HaystackLocation {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  timezone?: string;
  phone?: string;
  capacity?: number;
  created_at: string;
  updated_at: string;
}

interface LocationsResponse {
  data: HaystackLocation[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    has_more: boolean;
  };
}

interface ListLocationsOptions {
  updatedAfter?: string;
}

export async function* listLocations(
  client: HaystackClient,
  options: ListLocationsOptions = {}
): AsyncGenerator<HaystackLocation[], void, undefined> {
  let offset = 0;
  const limit = 100;

  while (true) {
    const params: Record<string, string> = {
      offset: String(offset),
      limit: String(limit),
    };

    if (options.updatedAfter) {
      params.updated_after = options.updatedAfter;
    }

    const response = await client.get<LocationsResponse>("/locations", params);

    if (response.data.length > 0) {
      yield response.data;
    }

    if (!response.pagination.has_more) {
      break;
    }
    offset += limit;
  }
}
