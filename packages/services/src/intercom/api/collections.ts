import type { IntercomClient } from "../client";

export type IntercomCollection = {
  type: string;
  id: string;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
  url: string | null;
  order: number | null;
  parent_id: string | null;
};

type CollectionListResponse = {
  type: string;
  data: IntercomCollection[];
};

export async function* getAllCollections(
  client: IntercomClient
): AsyncGenerator<IntercomCollection[], void, undefined> {
  for await (const page of client.paginateList<CollectionListResponse>(
    "/help_center/collections"
  )) {
    if (page.data.length > 0) {
      yield page.data;
    }
  }
}
