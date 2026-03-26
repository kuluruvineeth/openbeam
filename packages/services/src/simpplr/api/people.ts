import type { SimpplrClient } from "../client";

export interface SimpplrPerson {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  email: string;
  jobTitle?: string;
  department?: string;
  location?: string;
  phone?: string;
  bio?: string;
  manager?: {
    id: string;
    displayName: string;
    email?: string;
  };
  status?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

interface PeopleResponse {
  data: SimpplrPerson[];
  total?: number;
  hasMore?: boolean;
}

interface ListPeopleOptions {
  modifiedAfter?: string;
}

export async function* listPeople(
  client: SimpplrClient,
  options: ListPeopleOptions = {}
): AsyncGenerator<SimpplrPerson[], void, undefined> {
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

    const response = await client.get<PeopleResponse>("/people", params);

    if (response.data.length > 0) {
      yield response.data;
    }

    if (response.data.length < limit) {
      break;
    }
    offset += limit;
  }
}
