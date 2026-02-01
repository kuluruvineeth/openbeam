export interface DownloadFileInput {
  url: string;
  connectorId: string;
  externalId: string;
}

export interface DownloadFileResult {
  localPath: string;
  size: number;
  contentType?: string;
}

export interface UploadFileInput {
  localPath: string;
  key: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadFileResult {
  url: string;
  key: string;
}

export interface DeleteFilesInput {
  keys: string[];
}

export interface DeleteByPrefixInput {
  prefix: string;
}

export interface CleanupTempFileInput {
  path: string;
}

export interface GetSignedUrlInput {
  key: string;
  expiresIn?: number;
}

export interface ListFilesInput {
  prefix: string;
  limit?: number;
  cursor?: string;
}

export interface StorageObject {
  key: string;
  lastModified?: Date;
  size?: number;
  eTag?: string;
}

export interface ListFilesResult {
  objects: StorageObject[];
  nextCursor?: string;
}

export interface ExistsInput {
  key: string;
}

export interface StorageActivities {
  downloadFile(input: DownloadFileInput): Promise<DownloadFileResult>;
  uploadFile(input: UploadFileInput): Promise<UploadFileResult>;
  deleteFiles(input: DeleteFilesInput): Promise<void>;
  deleteByPrefix(input: DeleteByPrefixInput): Promise<{ deleted: number }>;
  cleanupTempFile(input: CleanupTempFileInput): Promise<void>;
  getSignedUrl(input: GetSignedUrlInput): Promise<string>;
  listFiles(input: ListFilesInput): Promise<ListFilesResult>;
  exists(input: ExistsInput): Promise<boolean>;
}
