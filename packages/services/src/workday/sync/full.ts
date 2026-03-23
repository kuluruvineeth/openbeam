import type {
  WorkdaySyncBatch,
  WorkdayTransformContext,
} from "@openbeam/types/services/connectors/workday";
import type { GenericDocument } from "@openbeam/vespa";
import type { WorkdayClient } from "../client";
import { transformOrganizations } from "../transformers/organization";
import { transformWorkers } from "../transformers/worker";
import { createSyncBatch } from "./utils";

const DEFAULT_PAGE_SIZE = 100;

interface FullSyncOptions {
  batchSize?: number;
  syncTerminated?: boolean;
  syncOrganizations?: boolean;
}

export async function* fullSync(
  client: WorkdayClient,
  context: WorkdayTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<WorkdaySyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_PAGE_SIZE,
    syncTerminated = false,
    syncOrganizations = true,
  } = options;

  let offset = 0;
  let hasMoreWorkers = true;

  while (hasMoreWorkers) {
    const page = await client.getWorkers({ offset, limit: batchSize });
    let workers = page.data;

    if (!syncTerminated) {
      workers = workers.filter((w) => w.isActive !== false);
    }

    const documents = await transformWorkers(workers, context);

    offset += page.data.length;
    hasMoreWorkers = offset < page.total && page.data.length > 0;

    yield createSyncBatch(
      documents,
      { lastSyncTime: Date.now() },
      "workers",
      hasMoreWorkers || syncOrganizations
    );
  }

  if (syncOrganizations) {
    let orgOffset = 0;
    let hasMoreOrgs = true;

    while (hasMoreOrgs) {
      const page = await client.getOrganizations({
        offset: orgOffset,
        limit: batchSize,
      });

      const orgs = page.data.filter((o) => o.isActive !== false);
      const documents = await transformOrganizations(orgs, context);

      orgOffset += page.data.length;
      hasMoreOrgs = orgOffset < page.total && page.data.length > 0;

      yield createSyncBatch(
        documents,
        { lastSyncTime: Date.now() },
        "organizations",
        hasMoreOrgs
      );
    }
  }
}
