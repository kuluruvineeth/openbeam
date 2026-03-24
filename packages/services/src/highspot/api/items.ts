import type { HighspotClient } from "../client";

export type HighspotItem = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  mime_type: string | null;
  url: string | null;
  author: { id: string; name: string; email: string } | null;
  spot_id: string | null;
  spot_name: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  file_size: number | null;
  view_count: number | null;
  pitch_count: number | null;
};

export function listAllItems(
  client: HighspotClient,
  params?: Record<string, string>
): AsyncGenerator<HighspotItem[], void, undefined> {
  return client.listAll<HighspotItem>("/items", params);
}
