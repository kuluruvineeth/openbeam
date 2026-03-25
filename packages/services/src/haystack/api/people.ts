import type { HaystackClient } from "../client";

export interface HaystackPerson {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  title?: string;
  department?: {
    id: string;
    name: string;
  };
  team?: {
    id: string;
    name: string;
  };
  manager?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  location?: {
    id: string;
    name: string;
    city?: string;
    country?: string;
  };
  phone?: string;
  start_date?: string;
  bio?: string;
  pronouns?: string;
  avatar_url?: string;
  status: string;
  custom_fields?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

interface PeopleResponse {
  data: HaystackPerson[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    has_more: boolean;
  };
}

interface ListPeopleOptions {
  updatedAfter?: string;
}

export async function* listPeople(
  client: HaystackClient,
  options: ListPeopleOptions = {}
): AsyncGenerator<HaystackPerson[], void, undefined> {
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

    const response = await client.get<PeopleResponse>("/people", params);

    if (response.data.length > 0) {
      yield response.data;
    }

    if (!response.pagination.has_more) {
      break;
    }
    offset += limit;
  }
}
