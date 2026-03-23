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

type FullSyncOptions = {
  batchSize?: number;
  syncLeads?: boolean;
  syncCases?: boolean;
  syncActivities?: boolean;
};

export async function* dynamics365FullSync(
  client: Dynamics365Client,
  context: Dynamics365TransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<Dynamics365SyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const syncLeads = options.syncLeads ?? true;
  const syncCases = options.syncCases ?? true;
  const syncActivities = options.syncActivities ?? true;

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = 0;

  for await (const page of listAllAccounts(client)) {
    for (const item of page) {
      try {
        documents.push(transformDynamics365Account(item, context));
        processed += 1;
        latestModified = trackModified(item.modifiedon, latestModified);
      } catch (error) {
        logger.error({ error }, "Error transforming Dynamics 365 account");
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

  for await (const page of listAllContacts(client)) {
    for (const item of page) {
      try {
        documents.push(transformDynamics365Contact(item, context));
        processed += 1;
        latestModified = trackModified(item.modifiedon, latestModified);
      } catch (error) {
        logger.error({ error }, "Error transforming Dynamics 365 contact");
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

  if (syncLeads) {
    for await (const page of listAllLeads(client)) {
      for (const item of page) {
        try {
          documents.push(transformDynamics365Lead(item, context));
          processed += 1;
          latestModified = trackModified(item.modifiedon, latestModified);
        } catch (error) {
          logger.error({ error }, "Error transforming Dynamics 365 lead");
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

  for await (const page of listAllOpportunities(client)) {
    for (const item of page) {
      try {
        documents.push(transformDynamics365Opportunity(item, context));
        processed += 1;
        latestModified = trackModified(item.modifiedon, latestModified);
      } catch (error) {
        logger.error({ error }, "Error transforming Dynamics 365 opportunity");
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

  if (syncCases) {
    for await (const page of listAllCases(client)) {
      for (const item of page) {
        try {
          documents.push(transformDynamics365Case(item, context));
          processed += 1;
          latestModified = trackModified(item.modifiedon, latestModified);
        } catch (error) {
          logger.error({ error }, "Error transforming Dynamics 365 case");
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

  if (syncActivities) {
    for await (const page of listAllActivities(client)) {
      for (const item of page) {
        try {
          documents.push(transformDynamics365Activity(item, context));
          processed += 1;
          latestModified = trackModified(item.modifiedon, latestModified);
        } catch (error) {
          logger.error({ error }, "Error transforming Dynamics 365 activity");
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

  const cursor: Dynamics365SyncCursor = {
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
): Dynamics365SyncBatch<GenericDocument> {
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

function trackModified(modifiedon: string, current: number): number {
  const ts = new Date(modifiedon).getTime();
  return ts > current ? ts : current;
}
