import type { AirtableClient } from "../client";

export type AirtableRecord = {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
};

export function listAllRecords(
  client: AirtableClient,
  baseId: string,
  tableIdOrName: string,
  params?: Record<string, string>
): AsyncGenerator<AirtableRecord[], void, undefined> {
  return client.listAllRecords<AirtableRecord>(baseId, tableIdOrName, params);
}
