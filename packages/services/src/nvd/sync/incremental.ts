import {
  NVD_MAX_DATE_RANGE_DAYS,
  type NvdSyncBatch,
  type NvdSyncCursor,
  type NvdSyncOptions,
  type NvdTransformContext,
} from "@openbeam/types/services/connectors/nvd";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { getAllCves } from "../api/cves";
import type { NvdClient } from "../client";
import { transformCve } from "../transformers/cve";

const DEFAULT_BATCH_SIZE = 50;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface DateWindow {
  start: string;
  end: string;
}

function buildDateWindows(since: string, until: string): DateWindow[] {
  const sinceMs = new Date(since).getTime();
  const untilMs = new Date(until).getTime();
  const maxWindowMs = NVD_MAX_DATE_RANGE_DAYS * MS_PER_DAY;

  const windows: DateWindow[] = [];
  let windowStart = sinceMs;

  while (windowStart < untilMs) {
    const windowEnd = Math.min(windowStart + maxWindowMs, untilMs);
    windows.push({
      start: new Date(windowStart).toISOString(),
      end: new Date(windowEnd).toISOString(),
    });
    windowStart = windowEnd;
  }

  return windows;
}

export async function* incrementalSync(
  client: NvdClient,
  context: NvdTransformContext,
  options: NvdSyncOptions = {}
): AsyncGenerator<NvdSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    cursor: resumeCursor,
    onStageChange,
  } = options;

  const lastModifiedDate =
    resumeCursor?.lastModifiedDate ??
    new Date(Date.now() - MS_PER_DAY).toISOString();
  const now = new Date().toISOString();

  logger.info({ lastModifiedDate, until: now }, "NVD incremental sync started");
  await onStageChange?.("Fetching modified CVEs", 0);

  const windows = buildDateWindows(lastModifiedDate, now);
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  for (const window of windows) {
    await onStageChange?.(
      "Processing window",
      processed,
      `${window.start} - ${window.end}`
    );

    for await (const page of getAllCves(client, {
      lastModStartDate: window.start,
      lastModEndDate: window.end,
    })) {
      for (const cve of page.cves) {
        try {
          const document = await transformCve(cve, context);
          documents.push(document);
          processed += 1;

          if (documents.length >= batchSize) {
            const cursor: NvdSyncCursor = {
              lastSyncTime: Date.now(),
              lastModifiedDate: now,
              currentWindowStart: window.start,
              currentWindowEnd: window.end,
              startIndex: page.startIndex + page.cves.length,
              totalResults: page.totalResults,
            };
            yield {
              items: documents,
              cursor,
              hasMore: true,
              stats: { processed, skipped: 0, errors },
            };
            documents = [];
          }
        } catch (error) {
          logger.error({ error, cveId: cve.id }, "Error transforming CVE");
          errors += 1;
        }
      }
    }
  }

  logger.info({ processed, errors }, "NVD incremental sync complete");

  if (documents.length > 0) {
    yield {
      items: documents,
      cursor: { lastSyncTime: Date.now(), lastModifiedDate: now },
      hasMore: false,
      stats: { processed, skipped: 0, errors },
    };
  }
}
