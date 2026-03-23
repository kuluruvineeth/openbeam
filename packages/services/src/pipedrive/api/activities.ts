import type { PipedriveClient } from "../client";

export type PipedriveActivity = {
  id: number;
  subject: string;
  type: string;
  due_date: string | null;
  due_time: string | null;
  done: boolean;
  note: string | null;
  deal_id: number | null;
  person_id: number | null;
  org_id: number | null;
  user_id: number;
  add_time: string;
  update_time: string;
  marked_as_done_time: string | null;
  active_flag: boolean;
  location: string | null;
};

export function listAllActivities(
  client: PipedriveClient,
  params?: Record<string, string>
): AsyncGenerator<PipedriveActivity[], void, undefined> {
  return client.listAll<PipedriveActivity>("/activities", params);
}
