import type {
  DocuSignSyncBatch,
  DocuSignSyncCursor,
  DocuSignTransformContext,
} from "@openbeam/types/services/connectors/docusign";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllEnvelopes } from "../api/envelopes";
import type { DocuSignClient } from "../client";
import { transformDocuSignEnvelope } from "../transformers/envelope";
import { docuSignFullSync } from "./full";

type SyncOptions = {
  cursor?: DocuSignSyncCursor;
  batchSize?: number;
  syncTemplates?: boolean;
  syncFolders?: boolean;
  envelopeStatusFilter?: string[];
  lookbackDays?: number;
};

export async function* docuSignIncrementalSync(
  client: DocuSignClient,
  context: DocuSignTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<DocuSignSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* docuSignFullSync(client, context, options);
    return;
  }

  const fromDate = new Date(cursor.lastSyncTime).toISOString();

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = cursor.lastSyncTime;

  try {
    const envelopeStatus =
      options.envelopeStatusFilter && options.envelopeStatusFilter.length > 0
        ? options.envelopeStatusFilter.join(",")
        : undefined;

    for await (const envelopes of listAllEnvelopes(client, {
      fromDate,
      status: envelopeStatus,
      orderBy: "last_modified",
      order: "asc",
    })) {
      for (const envelope of envelopes) {
        try {
          documents.push(transformDocuSignEnvelope(envelope, context));
          processed += 1;
          const ts = new Date(envelope.lastModifiedDateTime).getTime();
          if (ts > latestModified) {
            latestModified = ts;
          }
        } catch (error) {
          logger.error(
            { error, envelopeId: envelope.envelopeId },
            "Error transforming DocuSign envelope"
          );
          errors += 1;
        }

        if (documents.length >= batchSize) {
          yield {
            items: documents,
            cursor: {
              lastSyncTime: latestModified,
              lastFullSync: cursor.lastFullSync,
            },
            hasMore: true,
            stats: { processed, skipped, errors },
          };
          documents = [];
        }
      }
    }

    yield {
      items: documents,
      cursor: {
        lastSyncTime: latestModified,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "DocuSign incremental sync failed, falling back to full"
    );
    yield* docuSignFullSync(client, context, options);
  }
}
