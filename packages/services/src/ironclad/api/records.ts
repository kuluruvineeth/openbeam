import type { IroncladClient } from "../client";

export interface IroncladRecord {
  id: string;
  name: string;
  type: string;
  status: string;
  counterpartyName: string;
  properties: Record<string, unknown>;
  created: string;
  lastUpdated: string;
}

interface RecordsResponse {
  list: IroncladRecord[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface ListRecordsOptions {
  lastUpdated?: string;
}

export async function* listRecords(
  client: IroncladClient,
  options: ListRecordsOptions = {}
): AsyncGenerator<IroncladRecord[], void, undefined> {
  let page = 0;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      pageSize: "100",
    };

    if (options.lastUpdated) {
      params.filter = `lastUpdated>="${options.lastUpdated}"`;
    }

    const response = await client.get<RecordsResponse>("/records", params);

    if (response.list.length > 0) {
      yield response.list;
    }

    if (!response.hasMore) {
      break;
    }
    page += 1;
  }
}

export function getRecord(
  client: IroncladClient,
  recordId: string
): Promise<IroncladRecord> {
  return client.get<IroncladRecord>(`/records/${recordId}`);
}
