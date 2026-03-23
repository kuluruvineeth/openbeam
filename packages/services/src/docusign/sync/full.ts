import type {
  DocuSignSyncBatch,
  DocuSignSyncCursor,
  DocuSignTransformContext,
} from "@openbeam/types/services/connectors/docusign";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllEnvelopes } from "../api/envelopes";
import { listAllFolders } from "../api/folders";
import { listAllTemplates } from "../api/templates";
import type { DocuSignClient } from "../client";
import { transformDocuSignEnvelope } from "../transformers/envelope";
import { transformDocuSignFolder } from "../transformers/folder";
import { transformDocuSignTemplate } from "../transformers/template";

export async function* docuSignFullSync(
  client: DocuSignClient,
  context: DocuSignTransformContext,
  options: {
    batchSize?: number;
    syncTemplates?: boolean;
    syncFolders?: boolean;
    envelopeStatusFilter?: string[];
    lookbackDays?: number;
  } = {}
): AsyncGenerator<DocuSignSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const syncTemplates = options.syncTemplates ?? true;
  const syncFolders = options.syncFolders ?? true;
  const lookbackDays = options.lookbackDays ?? 365;

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = 0;

  const fromDate = new Date(
    Date.now() - lookbackDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const envelopeParams: Record<string, string> = {};
  if (options.envelopeStatusFilter && options.envelopeStatusFilter.length > 0) {
    envelopeParams.status = options.envelopeStatusFilter.join(",");
  }

  for await (const envelopes of listAllEnvelopes(client, {
    fromDate,
    status: envelopeParams.status,
  })) {
    for (const envelope of envelopes) {
      try {
        documents.push(transformDocuSignEnvelope(envelope, context));
        processed += 1;
        latestModified = trackModified(
          envelope.lastModifiedDateTime,
          latestModified
        );
      } catch (error) {
        logger.error(
          { error, envelopeId: envelope.envelopeId },
          "Error transforming DocuSign envelope"
        );
        errors += 1;
      }
    }
    if (documents.length >= batchSize) {
      yield makeBatch(
        documents,
        { processed, skipped, errors },
        true,
        latestModified
      );
      documents = [];
    }
  }

  if (syncTemplates) {
    for await (const templates of listAllTemplates(client)) {
      for (const template of templates) {
        try {
          documents.push(transformDocuSignTemplate(template, context));
          processed += 1;
          latestModified = trackModified(template.lastModified, latestModified);
        } catch (error) {
          logger.error(
            { error, templateId: template.templateId },
            "Error transforming DocuSign template"
          );
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          true,
          latestModified
        );
        documents = [];
      }
    }
  }

  if (syncFolders) {
    try {
      const folders = await listAllFolders(client);
      for (const folder of folders) {
        try {
          documents.push(transformDocuSignFolder(folder, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, folderId: folder.folderId },
            "Error transforming DocuSign folder"
          );
          errors += 1;
        }
      }
    } catch (error) {
      logger.error({ error }, "Error fetching DocuSign folders");
      errors += 1;
    }
  }

  const cursor: DocuSignSyncCursor = {
    lastSyncTime: latestModified || Date.now(),
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}

function makeBatch(
  items: GenericDocument[],
  stats: { processed: number; skipped: number; errors: number },
  hasMore: boolean,
  latestModified: number
): DocuSignSyncBatch<GenericDocument> {
  return {
    items,
    cursor: {
      lastSyncTime: latestModified || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore,
    stats,
  };
}

function trackModified(dateStr: string, current: number): number {
  const ts = new Date(dateStr).getTime();
  return ts > current ? ts : current;
}
