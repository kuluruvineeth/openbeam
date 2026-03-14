import type {
  CisaKevSyncBatch,
  CisaKevSyncOptions,
  CisaKevTransformContext,
} from "@openbeam/types/services/connectors/cisa-kev";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { fetchKevCatalog } from "../client";
import { transformKevVulnerability } from "../transformers/vulnerability";

const DEFAULT_BATCH_SIZE = 50;

export async function* fullSync(
  context: CisaKevTransformContext,
  options: CisaKevSyncOptions = {}
): AsyncGenerator<CisaKevSyncBatch<GenericDocument>, void, undefined> {
  const { batchSize = DEFAULT_BATCH_SIZE, onStageChange } = options;

  await onStageChange?.("Downloading CISA KEV catalog", 0);
  const catalog = await fetchKevCatalog();

  logger.info(
    { version: catalog.catalogVersion, total: catalog.vulnerabilities.length },
    "CISA KEV full sync started"
  );

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  await onStageChange?.("Transforming vulnerabilities", 0);

  for (const vuln of catalog.vulnerabilities) {
    try {
      const document = await transformKevVulnerability(vuln, context);
      documents.push(document);
      processed += 1;

      if (documents.length >= batchSize) {
        await onStageChange?.(
          "Transforming vulnerabilities",
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
          stats: { processed, skipped: 0, errors },
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

  logger.info({ processed, errors }, "CISA KEV full sync complete");

  if (documents.length > 0) {
    yield {
      items: documents,
      cursor: {
        lastSyncTime: Date.now(),
        catalogVersion: catalog.catalogVersion,
        lastCount: catalog.count,
      },
      hasMore: false,
      stats: { processed, skipped: 0, errors },
    };
  }
}
