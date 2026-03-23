import type {
  GreenhouseSyncBatch,
  GreenhouseTransformContext,
} from "@openbeam/types/services/connectors/greenhouse";
import type { GenericDocument } from "@openbeam/vespa";
import type { GreenhouseClient } from "../client";
import { transformApplication } from "../transformers/application";
import { transformCandidate } from "../transformers/candidate";
import { transformJob } from "../transformers/job";
import { transformOffer } from "../transformers/offer";
import { createSyncBatch } from "./utils";

const MS_PER_DAY = 86_400_000;

interface FullSyncOptions {
  batchSize?: number;
  syncCandidates?: boolean;
  syncApplications?: boolean;
  syncOffers?: boolean;
  lookbackDays?: number;
  statusFilter?: string;
  departmentFilter?: string;
  departmentId?: number;
}

export async function* fullSync(
  client: GreenhouseClient,
  context: GreenhouseTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<GreenhouseSyncBatch<GenericDocument>, void, undefined> {
  const {
    syncCandidates = true,
    syncApplications = true,
    syncOffers = false,
    lookbackDays = 0,
    statusFilter,
    departmentId,
  } = options;

  const updatedAfter =
    lookbackDays > 0
      ? new Date(Date.now() - lookbackDays * MS_PER_DAY).toISOString()
      : undefined;

  for await (const page of client.listJobs({
    updatedAfter,
    perPage: 100,
    status: statusFilter || undefined,
    departmentId,
  })) {
    const documents = await Promise.all(
      page.data.map((job) => transformJob(job, context))
    );
    yield createSyncBatch(
      documents,
      { lastSyncTime: Date.now() },
      "jobs",
      page.nextUrl !== null
    );
  }

  if (syncCandidates) {
    for await (const page of client.listCandidates({
      updatedAfter,
      perPage: 100,
    })) {
      const documents = await Promise.all(
        page.data.map((candidate) => transformCandidate(candidate, context))
      );
      yield createSyncBatch(
        documents,
        { lastSyncTime: Date.now() },
        "candidates",
        page.nextUrl !== null
      );
    }
  }

  if (syncApplications) {
    for await (const page of client.listApplications({
      updatedAfter,
      perPage: 100,
    })) {
      const documents = await Promise.all(
        page.data.map((app) => transformApplication(app, context))
      );
      yield createSyncBatch(
        documents,
        { lastSyncTime: Date.now() },
        "applications",
        page.nextUrl !== null
      );
    }
  }

  if (syncOffers) {
    for await (const page of client.listOffers({
      updatedAfter,
      perPage: 100,
    })) {
      const documents = await Promise.all(
        page.data.map((offer) => transformOffer(offer, context))
      );
      yield createSyncBatch(
        documents,
        { lastSyncTime: Date.now() },
        "offers",
        page.nextUrl !== null
      );
    }
  }

  yield createSyncBatch([], { lastSyncTime: Date.now() }, "complete", false);
}
