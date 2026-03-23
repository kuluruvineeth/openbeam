import type {
  S3SyncBatch,
  S3TransformContext,
} from "@openbeam/types/services/connectors/s3";
import type { GenericDocument } from "@openbeam/vespa";
import type { S3Client, S3Object } from "../client";
import { transformObjects } from "../transformers/object";
import { createSyncBatch } from "./utils";

const BYTES_PER_MB = 1_048_576;
const MS_PER_DAY = 86_400_000;

interface FullSyncOptions {
  pageSize?: number;
  prefixFilter?: string;
  excludePrefixes?: string[];
  fileTypesFilter?: string[];
  maxFileSizeMb?: number;
  lookbackDays?: number;
}

function shouldIncludeObject(obj: S3Object, options: FullSyncOptions): boolean {
  if (options.excludePrefixes && options.excludePrefixes.length > 0) {
    for (const prefix of options.excludePrefixes) {
      if (obj.key.startsWith(prefix)) {
        return false;
      }
    }
  }

  if (options.fileTypesFilter && options.fileTypesFilter.length > 0) {
    const ext =
      obj.key.lastIndexOf(".") !== -1
        ? obj.key.slice(obj.key.lastIndexOf(".") + 1).toLowerCase()
        : "";
    if (!(ext && options.fileTypesFilter.includes(ext))) {
      return false;
    }
  }

  if (
    options.maxFileSizeMb &&
    options.maxFileSizeMb > 0 &&
    obj.size > options.maxFileSizeMb * BYTES_PER_MB
  ) {
    return false;
  }

  if (options.lookbackDays && options.lookbackDays > 0) {
    const cutoff = Date.now() - options.lookbackDays * MS_PER_DAY;
    if (new Date(obj.lastModified).getTime() < cutoff) {
      return false;
    }
  }

  if (obj.key.endsWith("/") && obj.size === 0) {
    return false;
  }

  return true;
}

export async function* fullSync(
  client: S3Client,
  context: S3TransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<S3SyncBatch<GenericDocument>, void, undefined> {
  const { pageSize = 1000, prefixFilter = "" } = options;
  const clampedPageSize = Math.min(pageSize, 1000);

  let continuationToken: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await client.listObjects({
      prefix: prefixFilter || undefined,
      maxKeys: clampedPageSize,
      continuationToken,
    });

    const filtered = response.objects.filter((obj) =>
      shouldIncludeObject(obj, options)
    );

    const documents = await transformObjects(filtered, context);
    hasMore = response.isTruncated;
    continuationToken = response.continuationToken;

    yield createSyncBatch(
      documents,
      { lastSyncTime: Date.now(), continuationToken },
      "objects",
      hasMore
    );
  }
}
