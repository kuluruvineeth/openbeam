import type { ZendeskClient } from "../client";

type ZendeskUserRecord = {
  id: number;
  name: string;
  email: string;
};

type UserListResponse = {
  users: ZendeskUserRecord[];
};

export type ZendeskUserLookup = Map<number, { name: string; email: string }>;

export async function buildUserLookup(
  client: ZendeskClient,
  userIds: number[]
): Promise<ZendeskUserLookup> {
  const lookup: ZendeskUserLookup = new Map();
  if (userIds.length === 0) {
    return lookup;
  }

  const unique = [...new Set(userIds)];
  const batchSize = 100;

  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const response = await client.get<UserListResponse>(
      "/users/show_many.json",
      { ids: batch.join(",") }
    );

    for (const user of response.users) {
      lookup.set(user.id, { name: user.name, email: user.email });
    }
  }

  return lookup;
}
