export interface ProcoreRfiCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface ProcoreRfiUpdateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface ProcoreSubmittalCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface ProcoreActionResults {
  rfi_create: ProcoreRfiCreateResult;
  rfi_update: ProcoreRfiUpdateResult;
  submittal_create: ProcoreSubmittalCreateResult;
}
