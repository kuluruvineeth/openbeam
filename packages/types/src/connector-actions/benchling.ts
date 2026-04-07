export interface BenchlingEntryCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface BenchlingEntryUpdateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface BenchlingActionResults {
  entry_create: BenchlingEntryCreateResult;
  entry_update: BenchlingEntryUpdateResult;
}
