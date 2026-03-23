import type { CodaClient } from "../client";

export type CodaColumn = {
  id: string;
  type: string;
  href: string;
  name: string;
  display?: boolean;
  calculated?: boolean;
  formula?: string;
  defaultValue?: string;
  format?: { type: string; isArray?: boolean; precision?: number };
};

export type CodaTable = {
  id: string;
  type: string;
  tableType: string;
  href: string;
  browserLink: string;
  name: string;
  parent: {
    id: string;
    type: string;
    href: string;
    browserLink: string;
    name: string;
  };
  parentTable?: {
    id: string;
    type: string;
    href: string;
    browserLink: string;
    name: string;
  };
  displayColumn: { id: string; type: string; href: string };
  rowCount: number;
  sorts: Array<{
    column: { id: string; type: string; href: string };
    direction: string;
  }>;
  layout: string;
  createdAt: string;
  updatedAt: string;
  filter?: unknown;
};

export function listAllTables(
  client: CodaClient,
  docId: string
): AsyncGenerator<CodaTable[], void, undefined> {
  return client.listAll<CodaTable>(`/docs/${docId}/tables`, {
    tableTypes: "table",
  });
}

export function getTable(
  client: CodaClient,
  docId: string,
  tableId: string
): Promise<CodaTable> {
  return client.get<CodaTable>(`/docs/${docId}/tables/${tableId}`);
}

export async function listColumns(
  client: CodaClient,
  docId: string,
  tableId: string
): Promise<CodaColumn[]> {
  const allColumns: CodaColumn[] = [];
  for await (const batch of client.listAll<CodaColumn>(
    `/docs/${docId}/tables/${tableId}/columns`
  )) {
    allColumns.push(...batch);
  }
  return allColumns;
}
