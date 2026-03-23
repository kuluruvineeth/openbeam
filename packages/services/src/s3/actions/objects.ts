import type { S3Client } from "../client";

export interface DeleteObjectResult {
  success: boolean;
  key?: string;
  error?: string;
}

export function deleteObject(
  _client: S3Client,
  _key: string
): DeleteObjectResult {
  return {
    success: false,
    error:
      "Delete operations are not supported in read-only mode. Configure write permissions to enable.",
  };
}
