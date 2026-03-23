import type { AirtableClient } from "../client";

export type AirtableFieldConfig = {
  color?: string;
  icon?: string;
  [key: string]: unknown;
};

export type AirtableField = {
  id: string;
  name: string;
  type: string;
  description?: string;
  options?: Record<string, unknown>;
};

export type AirtableView = {
  id: string;
  name: string;
  type: string;
};

export type AirtableTable = {
  id: string;
  name: string;
  description?: string;
  primaryFieldId: string;
  fields: AirtableField[];
  views: AirtableView[];
};

type ListTablesResponse = {
  tables: AirtableTable[];
};

export async function listTables(
  client: AirtableClient,
  baseId: string
): Promise<AirtableTable[]> {
  const response = await client.get<ListTablesResponse>(
    `/meta/bases/${baseId}/tables`
  );
  return response.tables ?? [];
}
