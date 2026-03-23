import type { PipedriveClient } from "../client";

export type PipedriveOrganization = {
  id: number;
  name: string;
  address: string | null;
  address_street_number: string | null;
  address_route: string | null;
  address_locality: string | null;
  address_country: string | null;
  owner_id: { id: number; name: string; email: string } | null;
  add_time: string;
  update_time: string;
  visible_to: string;
  active_flag: boolean;
  people_count: number;
};

export function listAllOrganizations(
  client: PipedriveClient,
  params?: Record<string, string>
): AsyncGenerator<PipedriveOrganization[], void, undefined> {
  return client.listAll<PipedriveOrganization>("/organizations", params);
}
