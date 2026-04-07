export interface CanvaDesignCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface CanvaFolderCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface CanvaActionResults {
  design_create: CanvaDesignCreateResult;
  folder_create: CanvaFolderCreateResult;
}
