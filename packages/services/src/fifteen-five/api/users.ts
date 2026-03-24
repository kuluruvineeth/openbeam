import type { FifteenFiveClient } from "../client";

export interface FifteenFiveUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  role: string | null;
  job_title: string | null;
}

interface UsersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FifteenFiveUser[];
}

export async function* listUsers(
  client: FifteenFiveClient
): AsyncGenerator<FifteenFiveUser[], void, undefined> {
  let page = 1;

  while (true) {
    const response = await client.get<UsersResponse>("/user/", {
      page: String(page),
      page_size: "200",
    });

    if (response.results.length > 0) {
      yield response.results;
    }

    if (!response.next) {
      break;
    }
    page += 1;
  }
}

export function buildUserLookup(
  users: FifteenFiveUser[]
): Map<number, FifteenFiveUser> {
  return new Map(users.map((u) => [u.id, u]));
}
