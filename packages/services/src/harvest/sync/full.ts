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

export async function* harvestFullSync(
  client: HarvestClient,
  context: HarvestTransformContext,
  options: {
    batchSize?: number;
    syncExpenses?: boolean;
    syncInvoices?: boolean;
  } = {}
): AsyncGenerator<HarvestSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const syncExpenses = options.syncExpenses ?? true;
  const syncInvoices = options.syncInvoices ?? true;

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = 0;

  for await (const entries of listAllTimeEntries(client)) {
    for (const entry of entries) {
      try {
        documents.push(transformHarvestTimeEntry(entry, context));
        processed += 1;
        latestModified = trackModified(entry.updated_at, latestModified);
      } catch (error) {
        logger.error(
          { error, entryId: entry.id },
          "Error transforming Harvest time entry"
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

  for await (const projects of listAllProjects(client)) {
    for (const project of projects) {
      try {
        documents.push(transformHarvestProject(project, context));
        processed += 1;
        latestModified = trackModified(project.updated_at, latestModified);
      } catch (error) {
        logger.error(
          { error, projectId: project.id },
          "Error transforming Harvest project"
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

  for await (const tasks of listAllTasks(client)) {
    for (const task of tasks) {
      try {
        documents.push(transformHarvestTask(task, context));
        processed += 1;
        latestModified = trackModified(task.updated_at, latestModified);
      } catch (error) {
        logger.error(
          { error, taskId: task.id },
          "Error transforming Harvest task"
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

  for await (const clients of listAllClients(client)) {
    for (const harvestClient of clients) {
      try {
        documents.push(transformHarvestClient(harvestClient, context));
        processed += 1;
        latestModified = trackModified(
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

  if (syncInvoices) {
    for await (const invoices of listAllInvoices(client)) {
      for (const invoice of invoices) {
        try {
          documents.push(transformHarvestInvoice(invoice, context));
          processed += 1;
          latestModified = trackModified(invoice.updated_at, latestModified);
        } catch (error) {
          logger.error(
            { error, invoiceId: invoice.id },
            "Error transforming Harvest invoice"
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

  if (syncExpenses) {
    for await (const expenses of listAllExpenses(client)) {
      for (const expense of expenses) {
        try {
          documents.push(transformHarvestExpense(expense, context));
          processed += 1;
          latestModified = trackModified(expense.updated_at, latestModified);
        } catch (error) {
          logger.error(
            { error, expenseId: expense.id },
            "Error transforming Harvest expense"
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

  const cursor: HarvestSyncCursor = {
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
): HarvestSyncBatch<GenericDocument> {
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

function trackModified(updateTime: string, current: number): number {
  const ts = new Date(updateTime).getTime();
  return ts > current ? ts : current;
}
