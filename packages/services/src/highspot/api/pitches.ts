import type { HighspotClient } from "../client";

export type HighspotPitch = {
  id: string;
  title: string;
  description: string | null;
  sender: { id: string; name: string; email: string } | null;
  recipients: { email: string; name: string | null }[];
  items: { id: string; title: string }[];
  status: string;
  created_at: string;
  updated_at: string;
  url: string | null;
  view_count: number | null;
  opened: boolean | null;
};

export function listAllPitches(
  client: HighspotClient,
  params?: Record<string, string>
): AsyncGenerator<HighspotPitch[], void, undefined> {
  return client.listAll<HighspotPitch>("/pitches", params);
}
