import type { HighspotClient } from "../client";

export type HighspotSpot = {
  id: string;
  name: string;
  description: string | null;
  owner: { id: string; name: string; email: string } | null;
  item_count: number;
  created_at: string;
  updated_at: string;
  url: string | null;
  visibility: string | null;
};

export function listAllSpots(
  client: HighspotClient,
  params?: Record<string, string>
): AsyncGenerator<HighspotSpot[], void, undefined> {
  return client.listAll<HighspotSpot>("/spots", params);
}
