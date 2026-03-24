import type { HarvestClient } from "../client";

export type HarvestApiClient = {
  id: number;
  name: string;
  is_active: boolean;
  address: string | null;
  statement_key: string;
  currency: string;
  created_at: string;
  updated_at: string;
};

export function listAllClients(
  client: HarvestClient,
  params?: Record<string, string>
): AsyncGenerator<HarvestApiClient[], void, undefined> {
  return client.paginate<HarvestApiClient>("/clients", "clients", params);
}
