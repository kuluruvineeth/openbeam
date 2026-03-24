import type {
  HarvestSyncBatch,
  HarvestSyncCursor,
  HarvestTransformContext,
} from "@openbeam/types/services/connectors/harvest";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllClients } from "../api/clients";
import { listAllExpenses } from "../api/expenses";
import { listAllInvoices } from "../api/invoices";
import { listAllProjects } from "../api/projects";
import { listAllTasks } from "../api/tasks";
import { listAllTimeEntries } from "../api/time-entries";
import type { HarvestClient } from "../client";
import { transformHarvestClient } from "../transformers/client";
import { transformHarvestExpense } from "../transformers/expense";
import { transformHarvestInvoice } from "../transformers/invoice";
import { transformHarvestProject } from "../transformers/project";
import { transformHarvestTask } from "../transformers/task";
import { transformHarvestTimeEntry } from "../transformers/time-entry";
import { harvestFullSync } from "./full";

type SyncOptions = {
  cursor?: HarvestSyncCursor;
  batchSize?: number;
  syncExpenses?: boolean;
  syncInvoices?: boolean;
};

export async function* harvestIncrementalSync(
  client: HarvestClient,
  context: HarvestTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<HarvestSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* harvestFullSync(client, context, options);
    return;
  }

  const updatedSince = new Date(cursor.lastSyncTime).toISOString();
  const sinceParams = { updated_since: updatedSince };

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = cursor.lastSyncTime;

  try {
    for await (const entries of listAllTimeEntries(client, sinceParams)) {
      for (const entry of entries) {
        try {
          documents.push(transformHarvestTimeEntry(entry, context));
          processed += 1;
          latestModified = trackTimestamp(entry.updated_at, latestModified);
        } catch (error) {
          logger.error(
            { error, entryId: entry.id },
            "Error transforming Harvest time entry"
          );
          errors += 1;
        }
        if (documents.length >= batchSize) {
          yield makeBatch({
            items: documents,
            stats: { processed, skipped, errors },
            hasMore: true,
            latestModified,
            cursor,
          });
          documents = [];
        }
      }
    }

    for await (const projects of listAllProjects(client, sinceParams)) {
      for (const project of projects) {
        try {
          documents.push(transformHarvestProject(project, context));
          processed += 1;
          latestModified = trackTimestamp(project.updated_at, latestModified);
        } catch (error) {
          logger.error(
            { error, projectId: project.id },
            "Error transforming Harvest project"
          );
          errors += 1;
        }
        if (documents.length >= batchSize) {
          yield makeBatch({
            items: documents,
            stats: { processed, skipped, errors },
            hasMore: true,
            latestModified,
            cursor,
          });
          documents = [];
        }
      }
    }

    for await (const tasks of listAllTasks(client, sinceParams)) {
      for (const task of tasks) {
        try {
          documents.push(transformHarvestTask(task, context));
          processed += 1;
          latestModified = trackTimestamp(task.updated_at, latestModified);
        } catch (error) {
          logger.error(
            { error, taskId: task.id },
            "Error transforming Harvest task"
          );
          errors += 1;
        }
        if (documents.length >= batchSize) {
          yield makeBatch({
            items: documents,
            stats: { processed, skipped, errors },
            hasMore: true,
            latestModified,
            cursor,
          });
          documents = [];
        }
      }
    }

    for await (const clients of listAllClients(client, sinceParams)) {
      for (const harvestClient of clients) {
        try {
          documents.push(transformHarvestClient(harvestClient, context));
          processed += 1;
          latestModified = trackTimestamp(
            harvestClient.updated_at,
            latestModified
          );
        } catch (error) {
          logger.error(
            { error, clientId: harvestClient.id },
            "Error transforming Harvest client"
          );
          errors += 1;
        }
        if (documents.length >= batchSize) {
          yield makeBatch({
            items: documents,
            stats: { processed, skipped, errors },
            hasMore: true,
            latestModified,
            cursor,
          });
          documents = [];
        }
      }
    }

    if (options.syncInvoices !== false) {
      for await (const invoices of listAllInvoices(client, sinceParams)) {
        for (const invoice of invoices) {
          try {
            documents.push(transformHarvestInvoice(invoice, context));
            processed += 1;
            latestModified = trackTimestamp(invoice.updated_at, latestModified);
          } catch (error) {
            logger.error(
              { error, invoiceId: invoice.id },
              "Error transforming Harvest invoice"
            );
            errors += 1;
          }
          if (documents.length >= batchSize) {
            yield makeBatch({
              items: documents,
              stats: { processed, skipped, errors },
              hasMore: true,
              latestModified,
              cursor,
            });
            documents = [];
          }
        }
      }
    }

    if (options.syncExpenses !== false) {
      for await (const expenses of listAllExpenses(client, sinceParams)) {
        for (const expense of expenses) {
          try {
            documents.push(transformHarvestExpense(expense, context));
            processed += 1;
            latestModified = trackTimestamp(expense.updated_at, latestModified);
          } catch (error) {
            logger.error(
              { error, expenseId: expense.id },
              "Error transforming Harvest expense"
            );
            errors += 1;
          }
          if (documents.length >= batchSize) {
            yield makeBatch({
              items: documents,
              stats: { processed, skipped, errors },
              hasMore: true,
              latestModified,
              cursor,
            });
            documents = [];
          }
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
      "Harvest incremental sync failed, falling back to full"
    );
    yield* harvestFullSync(client, context, options);
  }
}

type MakeBatchParams = {
  items: GenericDocument[];
  stats: { processed: number; skipped: number; errors: number };
  hasMore: boolean;
  latestModified: number;
  cursor: HarvestSyncCursor;
};

function makeBatch(params: MakeBatchParams): HarvestSyncBatch<GenericDocument> {
  return {
    items: params.items,
    cursor: {
      lastSyncTime: params.latestModified,
      lastFullSync: params.cursor.lastFullSync,
    },
    hasMore: params.hasMore,
    stats: params.stats,
  };
}

function trackTimestamp(updateTime: string, current: number): number {
  const ts = new Date(updateTime).getTime();
  return ts > current ? ts : current;
}
