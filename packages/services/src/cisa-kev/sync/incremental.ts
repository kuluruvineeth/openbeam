import type {
  CisaKevSyncBatch,
  CisaKevSyncCursor,
  CisaKevSyncOptions,
  CisaKevTransformContext,
} from "@openbeam/types/services/connectors/cisa-kev";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { fetchKevCatalog } from "../client";
import { transformKevVulnerability } from "../transformers/vulnerability";

const DEFAULT_BATCH_SIZE = 50;

function hasNewEntries(
  catalogVersion: string,
  catalogCount: number,
  cursor: CisaKevSyncCursor
): boolean {
  if (cursor.catalogVersion !== catalogVersion) {
    return true;
  }
  return cursor.lastCount !== catalogCount;
}

export async function* incrementalSync(
  context: CisaKevTransformContext,
  options: CisaKevSyncOptions = {}
): AsyncGenerator<CisaKevSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = DEFAULT_BATCH_SIZE,
    forceFullSync,
    onStageChange,
  } = options;

  await onStageChange?.("Downloading CISA KEV catalog", 0);
  const catalog = await fetchKevCatalog();

  if (
    !forceFullSync &&
    cursor &&
    !hasNewEntries(catalog.catalogVersion, catalog.count, cursor)
  ) {
    logger.info(
      { version: catalog.catalogVersion },
      "CISA KEV catalog unchanged, skipping incremental sync"
    );
    return;
  }

  const lastSyncTime = cursor?.lastSyncTime ?? 0;
  const cutoffDate = new Date(lastSyncTime).toISOString().slice(0, 10);

  const newVulnerabilities = forceFullSync
    ? catalog.vulnerabilities
    : catalog.vulnerabilities.filter((v) => v.dateAdded > cutoffDate);

  logger.info(
    {
      total: catalog.vulnerabilities.length,
      new: newVulnerabilities.length,
      cutoffDate,
    },
    "CISA KEV incremental sync started"
  );

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = catalog.vulnerabilities.length - newVulnerabilities.length;
  let errors = 0;

  await onStageChange?.("Transforming new vulnerabilities", 0);

  for (const vuln of newVulnerabilities) {
    try {
      const document = await transformKevVulnerability(vuln, context);
      documents.push(document);
      processed += 1;

      if (documents.length >= batchSize) {
        await onStageChange?.(
          "Transforming new vulnerabilities",
          processed,
          vuln.cveID
        );
        yield {
          items: documents,
          cursor: {
            lastSyncTime: Date.now(),
            catalogVersion: catalog.catalogVersion,
            lastCount: catalog.count,
          },
          hasMore: true,
          stats: { processed, skipped, errors },
        };
        documents = [];
      }
    } catch (error) {
      logger.error(
        { error, cveId: vuln.cveID },
        "Error transforming KEV vulnerability"
      );
      errors += 1;
    }
  }

  logger.info(
    { processed, skipped, errors },
    "CISA KEV incremental sync complete"
  );

  if (documents.length > 0) {
    yield {
      items: documents,
      cursor: {
        lastSyncTime: Date.now(),
        catalogVersion: catalog.catalogVersion,
        lastCount: catalog.count,
      },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  }
}
