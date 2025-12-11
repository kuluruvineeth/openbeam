import { S3StorageProvider, type StorageConfig } from "@openplane/storage";

export const SIGNED_URL_EXPIRY_SECONDS = 3600;

function loadConfig(): StorageConfig {
  return {
    bucket: process.env.GCS_BUCKET ?? "openplane-files",
    region: process.env.GCS_REGION ?? "us-central1",
    endpoint: process.env.GCS_ENDPOINT,
    publicEndpoint: process.env.GCS_PUBLIC_ENDPOINT,
    accessKeyId: process.env.GCS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.GCS_SECRET_ACCESS_KEY ?? "",
  };
}

let storageInstance: S3StorageProvider | null = null;

export function getStorageProvider(): S3StorageProvider {
  if (!storageInstance) {
    storageInstance = new S3StorageProvider(loadConfig());
  }
  return storageInstance;
}

export function resetStorageProvider(): void {
  storageInstance = null;
}
