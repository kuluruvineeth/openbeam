import type {
  BatchPushResponse,
  PushDocument,
  PushResult,
} from "@openbeam/types/services/connectors/custom";
import { feedSingleDocument } from "@openbeam/vespa";
import { createServiceLogger } from "../../lib/logger";
import type { FieldMapperContext } from "./field-mapper";
import { mapPushDocumentToGeneric } from "./field-mapper";

const log = createServiceLogger({ service: "custom-push-batch" });

const BATCH_CONCURRENCY = 10;

export async function pushBatch(
  documents: PushDocument[],
  ctx: FieldMapperContext
): Promise<BatchPushResponse> {
  const results: PushResult[] = [];

  for (let i = 0; i < documents.length; i += BATCH_CONCURRENCY) {
    const chunk = documents.slice(i, i + BATCH_CONCURRENCY);
    const chunkResults = await Promise.allSettled(
      chunk.map(async (doc) => {
        const genericDoc = mapPushDocumentToGeneric(doc, ctx);
        const feedResult = await feedSingleDocument(genericDoc, {
          skipValidation: false,
        });
        return { id: doc.id, feedResult };
      })
    );

    for (const settled of chunkResults) {
      if (settled.status === "fulfilled") {
        const { id, feedResult } = settled.value;
        results.push(
          feedResult.success
            ? { id, success: true }
            : {
                id,
                success: false,
                error: feedResult.error ?? "Feed failed",
              }
        );
      } else {
        const error =
          settled.reason instanceof Error
            ? settled.reason.message
            : "Unknown error";
        log.error({ error, connectorId: ctx.connectorId }, "Batch item failed");
        results.push({ id: "unknown", success: false, error });
      }
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.length - succeeded;

  if (failed > 0) {
    log.warn(
      {
        connectorId: ctx.connectorId,
        total: results.length,
        succeeded,
        failed,
      },
      "Batch push completed with failures"
    );
  }

  return {
    total: results.length,
    succeeded,
    failed,
    results,
  };
}
