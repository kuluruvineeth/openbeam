import type { HaystackClient } from "../client";

export interface HaystackTeam {
  id: string;
  name: string;
  description?: string;
  lead?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  member_count: number;
  members?: {
    id: string;
    first_name: string;
    last_name: string;
  }[];
  created_at: string;
  updated_at: string;
}

interface TeamsResponse {
  data: HaystackTeam[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    has_more: boolean;
  };
}

interface ListTeamsOptions {
  updatedAfter?: string;
}

export async function* listTeams(
  client: HaystackClient,
  options: ListTeamsOptions = {}
): AsyncGenerator<HaystackTeam[], void, undefined> {
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

    const response = await client.get<TeamsResponse>("/teams", params);

    if (response.data.length > 0) {
      yield response.data;
    }

    if (!response.pagination.has_more) {
      break;
    }
    offset += limit;
  }
}
