import type {
  Dynamics365SyncBatch,
  Dynamics365SyncCursor,
  Dynamics365TransformContext,
} from "@openbeam/types/services/connectors/dynamics365";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllAccounts } from "../api/accounts";
import { listAllActivities } from "../api/activities";
import { listAllCases } from "../api/cases";
import { listAllContacts } from "../api/contacts";
import { listAllLeads } from "../api/leads";
import { listAllOpportunities } from "../api/opportunities";
import type { Dynamics365Client } from "../client";
import { transformDynamics365Account } from "../transformers/account";
import { transformDynamics365Activity } from "../transformers/activity";
import { transformDynamics365Case } from "../transformers/case";
import { transformDynamics365Contact } from "../transformers/contact";
import { transformDynamics365Lead } from "../transformers/lead";
import { transformDynamics365Opportunity } from "../transformers/opportunity";
import { dynamics365FullSync } from "./full";

type IncrementalSyncOptions = {
  cursor?: Dynamics365SyncCursor;
  batchSize?: number;
  syncLeads?: boolean;
  syncCases?: boolean;
  syncActivities?: boolean;
};

export async function* dynamics365IncrementalSync(
  client: Dynamics365Client,
  context: Dynamics365TransformContext,
  options: IncrementalSyncOptions = {}
): AsyncGenerator<Dynamics365SyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* dynamics365FullSync(client, context, options);
    return;
  }

  const sinceIso = new Date(cursor.lastSyncTime).toISOString();
  const filter = `modifiedon ge ${sinceIso}`;
  const lastFullSync = cursor.lastFullSync;

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = cursor.lastSyncTime;

  try {
    for await (const page of listAllAccounts(client, filter)) {
      for (const item of page) {
        try {
          documents.push(transformDynamics365Account(item, context));
          processed += 1;
          latestModified = trackModified(item.modifiedon, latestModified);
        } catch (err) {
          logger.error(
            { error: err },
            "Error transforming Dynamics 365 account (incremental)"
          );
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield {
          items: documents,
          cursor: { lastSyncTime: latestModified, lastFullSync },
          hasMore: true,
          stats: { processed, skipped, errors },
        };
        documents = [];
      }
    }

    for await (const page of listAllContacts(client, filter)) {
      for (const item of page) {
        try {
          documents.push(transformDynamics365Contact(item, context));
          processed += 1;
          latestModified = trackModified(item.modifiedon, latestModified);
        } catch (err) {
          logger.error(
            { error: err },
            "Error transforming Dynamics 365 contact (incremental)"
          );
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield {
          items: documents,
          cursor: { lastSyncTime: latestModified, lastFullSync },
          hasMore: true,
          stats: { processed, skipped, errors },
        };
        documents = [];
      }
    }

    if (options.syncLeads !== false) {
      for await (const page of listAllLeads(client, filter)) {
        for (const item of page) {
          try {
            documents.push(transformDynamics365Lead(item, context));
            processed += 1;
            latestModified = trackModified(item.modifiedon, latestModified);
          } catch (err) {
            logger.error(
              { error: err },
              "Error transforming Dynamics 365 lead (incremental)"
            );
            errors += 1;
          }
        }
        if (documents.length >= batchSize) {
          yield {
            items: documents,
            cursor: { lastSyncTime: latestModified, lastFullSync },
            hasMore: true,
            stats: { processed, skipped, errors },
          };
          documents = [];
        }
      }
    }

    for await (const page of listAllOpportunities(client, filter)) {
      for (const item of page) {
        try {
          documents.push(transformDynamics365Opportunity(item, context));
          processed += 1;
          latestModified = trackModified(item.modifiedon, latestModified);
        } catch (err) {
          logger.error(
            { error: err },
            "Error transforming Dynamics 365 opportunity (incremental)"
          );
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield {
          items: documents,
          cursor: { lastSyncTime: latestModified, lastFullSync },
          hasMore: true,
          stats: { processed, skipped, errors },
        };
        documents = [];
      }
    }

    if (options.syncCases !== false) {
      for await (const page of listAllCases(client, filter)) {
        for (const item of page) {
          try {
            documents.push(transformDynamics365Case(item, context));
            processed += 1;
            latestModified = trackModified(item.modifiedon, latestModified);
          } catch (err) {
            logger.error(
              { error: err },
              "Error transforming Dynamics 365 case (incremental)"
            );
            errors += 1;
          }
        }
        if (documents.length >= batchSize) {
          yield {
            items: documents,
            cursor: { lastSyncTime: latestModified, lastFullSync },
            hasMore: true,
            stats: { processed, skipped, errors },
          };
          documents = [];
        }
      }
    }

    if (options.syncActivities !== false) {
      for await (const page of listAllActivities(client, filter)) {
        for (const item of page) {
          try {
            documents.push(transformDynamics365Activity(item, context));
            processed += 1;
            latestModified = trackModified(item.modifiedon, latestModified);
          } catch (err) {
            logger.error(
              { error: err },
              "Error transforming Dynamics 365 activity (incremental)"
            );
            errors += 1;
          }
        }
        if (documents.length >= batchSize) {
          yield {
            items: documents,
            cursor: { lastSyncTime: latestModified, lastFullSync },
            hasMore: true,
            stats: { processed, skipped, errors },
          };
          documents = [];
        }
      }
    }

    yield {
      items: documents,
      cursor: { lastSyncTime: latestModified, lastFullSync },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "Dynamics 365 incremental sync failed, falling back to full"
    );
    yield* dynamics365FullSync(client, context, options);
  }
}

function trackModified(modifiedon: string, current: number): number {
  const ts = new Date(modifiedon).getTime();
  return ts > current ? ts : current;
}
