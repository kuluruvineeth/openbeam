export interface LucidDocumentCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface LucidDocumentUpdateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface LucidFolderCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface LucidActionResults {
  document_create: LucidDocumentCreateResult;
  document_update: LucidDocumentUpdateResult;
  folder_create: LucidFolderCreateResult;
}
