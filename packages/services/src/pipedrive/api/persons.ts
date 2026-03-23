import type { PipedriveClient } from "../client";

export type PipedrivePerson = {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: Array<{ value: string; primary: boolean; label: string }>;
  phone: Array<{ value: string; primary: boolean; label: string }>;
  org_id: { value: number; name: string } | null;
  owner_id: { id: number; name: string; email: string } | null;
  add_time: string;
  update_time: string;
  visible_to: string;
  active_flag: boolean;
};

export function listAllPersons(
  client: PipedriveClient,
  params?: Record<string, string>
): AsyncGenerator<PipedrivePerson[], void, undefined> {
  return client.listAll<PipedrivePerson>("/persons", params);
}
