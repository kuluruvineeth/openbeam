import type { BenchlingClient } from "../client";

export interface BenchlingEntry {
  id: string;
  displayId: string;
  name: string;
  folderId: string;
  authors: { id: string; name: string }[];
  createdAt: string;
  modifiedAt: string;
  schema?: { id: string; name: string };
  fields?: Record<string, { value: unknown; displayValue?: string }>;
  webURL: string;
  apiURL: string;
  archiveRecord?: { reason: string } | null;
  reviewRecord?: { status: string } | null;
  entryTemplateId?: string | null;
}

interface EntryDaysContent {
  notes: { text?: string; type: string }[];
}

export interface BenchlingEntryDetailed extends BenchlingEntry {
  days?: EntryDaysContent[];
}

interface EntriesResponse {
  entries: BenchlingEntry[];
  nextToken?: string;
}

interface ListEntriesOptions {
  modifiedAt?: string;
}

export async function* listEntries(
  client: BenchlingClient,
  options: ListEntriesOptions = {}
): AsyncGenerator<BenchlingEntry[], void, undefined> {
  let nextToken: string | undefined;

  while (true) {
    const params: Record<string, string> = {
      pageSize: "100",
      sort: "modifiedAt:asc",
    };

    if (nextToken) {
      params.nextToken = nextToken;
    }

    if (options.modifiedAt) {
      params["modifiedAt.gte"] = options.modifiedAt;
    }

    const response = await client.get<EntriesResponse>("/entries", params);

    if (response.entries.length > 0) {
      yield response.entries;
    }

    if (!response.nextToken) {
      break;
    }
    nextToken = response.nextToken;
  }
}

export function getEntry(
  client: BenchlingClient,
  entryId: string
): Promise<BenchlingEntryDetailed> {
  return client.get<BenchlingEntryDetailed>(`/entries/${entryId}`);
}
