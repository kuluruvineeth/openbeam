import type { PipedriveClient } from "../client";

export type PipedriveNote = {
  id: number;
  content: string;
  deal_id: number | null;
  person_id: number | null;
  org_id: number | null;
  user_id: number;
  add_time: string;
  update_time: string;
  active_flag: boolean;
  pinned_to_deal_flag: boolean;
  pinned_to_person_flag: boolean;
  pinned_to_organization_flag: boolean;
};

export function listAllNotes(
  client: PipedriveClient,
  params?: Record<string, string>
): AsyncGenerator<PipedriveNote[], void, undefined> {
  return client.listAll<PipedriveNote>("/notes", params);
}
