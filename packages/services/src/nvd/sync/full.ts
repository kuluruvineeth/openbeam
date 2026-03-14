import type {
  NvdSyncBatch,
  NvdSyncCursor,
  NvdSyncOptions,
  NvdTransformContext,
} from "@openbeam/types/services/connectors/nvd";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { getAllCves } from "../api/cves";
import type { NvdClient } from "../client";
import { transformCve } from "../transformers/cve";

const DEFAULT_BATCH_SIZE = 50;

export async function* fullSync(
  client: NvdClient,
  context: NvdTransformContext,
  options: NvdSyncOptions = {}
): AsyncGenerator<NvdSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    cursor: resumeCursor,
    onStageChange,
  } = options;

  const startIndex = resumeCursor?.startIndex ?? 0;

  logger.info({ startIndex }, "NVD full sync started");
  await onStageChange?.("Fetching CVEs", 0);

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;

  for await (const page of getAllCves(client, { startIndex })) {
    await onStageChange?.(
      "Processing CVEs",
      processed,
      `${page.startIndex}/${page.totalResults}`
    );

    for (const cve of page.cves) {
      try {
        const document = await transformCve(cve, context);
        documents.push(document);
        processed += 1;

        if (documents.length >= batchSize) {
          const cursor: NvdSyncCursor = {
            startIndex: page.startIndex + page.cves.length,
            totalResults: page.totalResults,
            lastSyncTime: Date.now(),
          };
          yield {
            items: documents,
            cursor,
            hasMore: true,
            stats: { processed, skipped, errors },
          };
          documents = [];
        }
      } catch (error) {
        logger.error({ error, cveId: cve.id }, "Error transforming CVE");
        errors += 1;
      }
    }
  }

  logger.info({ processed, skipped, errors }, "NVD full sync complete");

  if (documents.length > 0) {
    yield {
      items: documents,
      cursor: { lastSyncTime: Date.now() },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  }
}
