import { z } from "zod";

export const StorageConfigSchema = z.object({
  endpoint: z.string().optional(),
  publicEndpoint: z.string().optional(),
  region: z.string(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  bucket: z.string(),
  publicUrl: z.string().optional(),
});

export type StorageConfig = z.infer<typeof StorageConfigSchema>;

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface MultipartUploadPart {
  ETag: string;
  PartNumber: number;
}

export interface ListOptions {
  limit?: number;
  cursor?: string;
  delimiter?: string;
}

export interface StorageObject {
  key: string;
  lastModified?: Date;
  size?: number;
  eTag?: string;
}

export interface ListResult {
  objects: StorageObject[];
  nextCursor?: string;
  commonPrefixes?: string[];
}

export interface StorageProvider {
  upload(
    key: string,
    data: Buffer | Uint8Array | string | ReadableStream,
    options?: UploadOptions
  ): Promise<string>;
  delete(key: string): Promise<void>;
  deleteMany(keys: string[]): Promise<void>;

  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  getUrl(key: string): string;

  exists(key: string): Promise<boolean>;
  copy(sourceKey: string, destinationKey: string): Promise<void>;
  list(prefix?: string, options?: ListOptions): Promise<ListResult>;

  createMultipartUpload(key: string, options?: UploadOptions): Promise<string>;
  signPartUpload(
    key: string,
    uploadId: string,
    partNumber: number
  ): Promise<string>;
  completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: MultipartUploadPart[]
  ): Promise<void>;
  abortMultipartUpload(key: string, uploadId: string): Promise<void>;
}
