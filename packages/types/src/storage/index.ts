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

export const UploadOptionsSchema = z.object({
  contentType: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export type UploadOptions = z.infer<typeof UploadOptionsSchema>;

export const MultipartUploadPartSchema = z.object({
  ETag: z.string(),
  PartNumber: z.number(),
});

export type MultipartUploadPart = z.infer<typeof MultipartUploadPartSchema>;

export const ListOptionsSchema = z.object({
  limit: z.number().optional(),
  cursor: z.string().optional(),
  delimiter: z.string().optional(),
});

export type ListOptions = z.infer<typeof ListOptionsSchema>;

export const StorageObjectSchema = z.object({
  key: z.string(),
  lastModified: z.date().optional(),
  size: z.number().optional(),
  eTag: z.string().optional(),
});

export type StorageObject = z.infer<typeof StorageObjectSchema>;

export const ListResultSchema = z.object({
  objects: z.array(StorageObjectSchema),
  nextCursor: z.string().optional(),
  commonPrefixes: z.array(z.string()).optional(),
});

export type ListResult = z.infer<typeof ListResultSchema>;

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
