import type { CodaClient } from "../client";

export type CodaRowValue =
  | string
  | number
  | boolean
  | null
  | {
      [key: string]: unknown;
    };

export type CodaRow = {
  id: string;
  type: string;
  href: string;
  browserLink: string;
  name: string;
  index: number;
  createdAt: string;
  updatedAt: string;
  values: Record<string, CodaRowValue>;
  parent: {
    id: string;
    type: string;
    href: string;
    browserLink: string;
    name: string;
  };
};

export function listAllRows(
  client: CodaClient,
  docId: string,
  tableId: string,
  params?: Record<string, string>
): AsyncGenerator<CodaRow[], void, undefined> {
  return client.listAll<CodaRow>(`/docs/${docId}/tables/${tableId}/rows`, {
    useColumnNames: "true",
    valueFormat: "simpleWithArrays",
    ...params,
  });
}

export function getRow(
  client: CodaClient,
  docId: string,
  tableId: string,
  rowId: string
): Promise<CodaRow> {
  return client.get<CodaRow>(`/docs/${docId}/tables/${tableId}/rows/${rowId}`, {
    useColumnNames: "true",
    valueFormat: "simpleWithArrays",
  });
}
