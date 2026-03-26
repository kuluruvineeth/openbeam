import type { PushDocument } from "@openbeam/types/services/connectors/custom";
import { feedSingleDocument } from "@openbeam/vespa";
import { createServiceLogger } from "../../lib/logger";
import type { FieldMapperContext } from "./field-mapper";
import { mapPushDocumentToGeneric } from "./field-mapper";

const log = createServiceLogger({ service: "custom-push" });

export interface PushSingleResult {
  success: boolean;
  documentId: string;
  error?: string;
}

export async function pushSingleDocument(
  doc: PushDocument,
  ctx: FieldMapperContext
): Promise<PushSingleResult> {
  const genericDoc = mapPushDocumentToGeneric(doc, ctx);

  const result = await feedSingleDocument(genericDoc, {
    skipValidation: false,
  });

  if (!result.success) {
    log.error(
      { documentId: doc.id, connectorId: ctx.connectorId, error: result.error },
      "Push document feed failed"
    );
    return {
      success: false,
      documentId: doc.id,
      error: result.error ?? "Feed operation failed",
    };
  }

  return { success: true, documentId: doc.id };
}
