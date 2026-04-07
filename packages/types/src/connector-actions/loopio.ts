export interface LoopioLibraryEntryCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface LoopioLibraryEntryUpdateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface LoopioActionResults {
  library_entry_create: LoopioLibraryEntryCreateResult;
  library_entry_update: LoopioLibraryEntryUpdateResult;
}
