import type { AirtableClient } from "../client";

export type AirtableBase = {
  id: string;
  name: string;
  permissionLevel: string;
};

type ListBasesResponse = {
  bases: AirtableBase[];
  offset?: string;
};

export async function* listAllBases(
  client: AirtableClient
): AsyncGenerator<AirtableBase[], void, undefined> {
  let offset: string | undefined;

  do {
    const params: Record<string, string> = {};
    if (offset) {
      params.offset = offset;
    }
    const response = await client.get<ListBasesResponse>("/meta/bases", params);
    const bases = response.bases ?? [];
    if (bases.length > 0) {
      yield bases;
    }
    offset = response.offset;
  } while (offset);
}
