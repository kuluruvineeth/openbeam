import type { PhabricatorClient } from "../client";

interface PhabricatorUser {
  phid: string;
  userName: string;
  realName: string;
  image: string;
  uri: string;
  roles: string[];
}

interface UserSearchResponse {
  data: {
    id: number;
    type: string;
    phid: string;
    fields: {
      username: string;
      realName: string;
      dateCreated: number;
      dateModified: number;
      policy: { view: string; edit: string };
    };
  }[];
  cursor: { limit: number; after: string | null; before: string | null };
}

export type UserLookup = Map<string, string>;

export async function buildUserLookup(
  client: PhabricatorClient,
  phids: string[]
): Promise<UserLookup> {
  if (phids.length === 0) {
    return new Map();
  }

  const uniquePhids = [...new Set(phids)];
  const lookup: UserLookup = new Map();

  const batchSize = 100;
  for (let i = 0; i < uniquePhids.length; i += batchSize) {
    const batch = uniquePhids.slice(i, i + batchSize);

    const response = await client.post<UserSearchResponse>("user.search", {
      constraints: { phids: batch },
      limit: batchSize,
    });

    for (const user of response.data) {
      lookup.set(user.phid, user.fields.realName || user.fields.username);
    }
  }

  return lookup;
}

export function getCurrentUser(
  client: PhabricatorClient
): Promise<PhabricatorUser> {
  return client.post<PhabricatorUser>("user.whoami");
}
