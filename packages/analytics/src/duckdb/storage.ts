import {
  S3StorageProvider,
  type StorageConfig,
  type StorageObject,
} from "@openplane/storage";
import { z } from "zod";

const DATE_PARTITION_REGEX = /date=(\d{4}-\d{2}-\d{2})/;

export const AnalyticsStorageConfigSchema = z.object({
  bucket: z.string().default("openplane-analytics"),
  region: z.string().default("us-east-1"),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  endpoint: z.string().optional(),
  publicEndpoint: z.string().optional(),
});

export type AnalyticsStorageConfig = z.infer<
  typeof AnalyticsStorageConfigSchema
>;

const ENV_PREFIX = "ANALYTICS_STORAGE_";

function getConfigFromEnv(): Partial<AnalyticsStorageConfig> {
  return {
    bucket:
      process.env[`${ENV_PREFIX}BUCKET`] ?? process.env.GCS_ANALYTICS_BUCKET,
    region: process.env[`${ENV_PREFIX}REGION`] ?? process.env.GCS_REGION,
    accessKeyId:
      process.env[`${ENV_PREFIX}ACCESS_KEY_ID`] ??
      process.env.GCS_ACCESS_KEY_ID,
    secretAccessKey:
      process.env[`${ENV_PREFIX}SECRET_ACCESS_KEY`] ??
      process.env.GCS_SECRET_ACCESS_KEY,
    endpoint: process.env[`${ENV_PREFIX}ENDPOINT`] ?? process.env.GCS_ENDPOINT,
    publicEndpoint:
      process.env[`${ENV_PREFIX}PUBLIC_ENDPOINT`] ??
      process.env.GCS_PUBLIC_ENDPOINT,
  };
}

let cachedProvider: S3StorageProvider | null = null;

export function getAnalyticsStorage(
  config?: Partial<AnalyticsStorageConfig>
): S3StorageProvider {
  if (cachedProvider && !config) {
    return cachedProvider;
  }

  const envConfig = getConfigFromEnv();
  const mergedConfig = { ...envConfig, ...config };

  const parsed = AnalyticsStorageConfigSchema.parse(mergedConfig);

  const storageConfig: StorageConfig = {
    bucket: parsed.bucket,
    region: parsed.region,
    accessKeyId: parsed.accessKeyId,
    secretAccessKey: parsed.secretAccessKey,
    endpoint: parsed.endpoint,
    publicEndpoint: parsed.publicEndpoint,
  };

  const provider = new S3StorageProvider(storageConfig);

  if (!config) {
    cachedProvider = provider;
  }

  return provider;
}

export function getAnalyticsParquetPath(teamId: string, date: string): string {
  return `${teamId}/ai_usage/date=${date}/data.parquet`;
}

export function getAnalyticsParquetPattern(teamId: string): string {
  return `${teamId}/ai_usage/date=*/data.parquet`;
}

export async function listAnalyticsParquetFiles(
  storage: S3StorageProvider,
  teamId: string,
  options?: { startDate?: string; endDate?: string }
): Promise<string[]> {
  const prefix = `${teamId}/ai_usage/`;
  const result = await storage.list(prefix, { limit: 1000 });

  let files = result.objects
    .map((obj: StorageObject) => obj.key)
    .filter((key: string) => key.endsWith(".parquet"));

  if (options?.startDate || options?.endDate) {
    files = files.filter((key: string) => {
      const dateMatch = key.match(DATE_PARTITION_REGEX);
      if (!dateMatch?.[1]) {
        return false;
      }
      const fileDate = dateMatch[1];
      if (options.startDate && fileDate < options.startDate) {
        return false;
      }
      if (options.endDate && fileDate > options.endDate) {
        return false;
      }
      return true;
    });
  }

  return files;
}

export function resetAnalyticsStorageCache(): void {
  cachedProvider = null;
}
