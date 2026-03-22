import type { MondayUser } from "@openbeam/types/services/connectors/monday";
import type { MondayClient } from "../client";

const USERS_QUERY = `
  query GetUsers {
    users {
      id
      name
      email
      photo_thumb_small
      enabled
    }
  }
`;

export interface MondayUserLookup {
  readonly size: number;
  get(id: number): MondayUser | undefined;
  getName(id: number): string | undefined;
  getAvatar(id: number): string | undefined;
}

export async function createUserLookup(
  client: MondayClient
): Promise<MondayUserLookup> {
  const data = await client.query<{ users: MondayUser[] }>(USERS_QUERY);

  const map = new Map<number, MondayUser>();
  for (const user of data.users) {
    map.set(user.id, user);
  }

  return {
    size: map.size,
    get: (id: number) => map.get(id),
    getName: (id: number) => map.get(id)?.name,
    getAvatar: (id: number) => map.get(id)?.photo_thumb_small ?? undefined,
  };
}
