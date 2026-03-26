import type {
  ProcoreSyncBatch,
  ProcoreSyncCursor,
  ProcoreTransformContext,
} from "@openbeam/types/services/connectors/procore";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listProjectDocuments } from "../api/documents";
import { listProjectDrawings } from "../api/drawings";
import { listAllProjects } from "../api/projects";
import { listProjectRfis } from "../api/rfis";
import { listProjectSubmittals } from "../api/submittals";
import type { ProcoreClient } from "../client";
import { transformProcoreDocument } from "../transformers/document";
import { transformProcoreDrawing } from "../transformers/drawing";
import { transformProcoreProject } from "../transformers/project";
import { transformProcoreRfi } from "../transformers/rfi";
import { transformProcoreSubmittal } from "../transformers/submittal";
import { procoreFullSync } from "./full";

type SyncOptions = {
  cursor?: ProcoreSyncCursor;
  batchSize?: number;
  syncDocuments?: boolean;
  syncDrawings?: boolean;
  projectFilter?: number[];
};

type IncrementalState = {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
  latestModified: number;
};

type IncrementalContext = {
  client: ProcoreClient;
  context: ProcoreTransformContext;
  state: IncrementalState;
  batchSize: number;
  filter: Record<string, string>;
};

export async function* procoreIncrementalSync(
  client: ProcoreClient,
  context: ProcoreTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<ProcoreSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* procoreFullSync(client, context, options);
    return;
  }

  const sinceDate = new Date(cursor.lastSyncTime).toISOString();
  const projectFilter = options.projectFilter ?? [];
  const syncDocuments = options.syncDocuments ?? true;
  const syncDrawings = options.syncDrawings ?? true;
  const filter = { "filters[updated_at]": sinceDate };

  const state: IncrementalState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
    latestModified: cursor.lastSyncTime,
  };

  const ctx: IncrementalContext = { client, context, state, batchSize, filter };

  try {
    yield* syncUpdatedProjects(ctx, projectFilter);

    const projectIds = await collectAllProjectIds(client, projectFilter);

    for (const projectId of projectIds) {
      yield* syncEntityBatch(ctx, projectId, "rfis");
      yield* syncEntityBatch(ctx, projectId, "submittals");
      if (syncDocuments) {
        yield* syncEntityBatch(ctx, projectId, "documents");
      }
      if (syncDrawings) {
        yield* syncEntityBatch(ctx, projectId, "drawings");
      }
    }

    yield {
      items: state.documents,
      cursor: {
        lastSyncTime: state.latestModified,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: {
        processed: state.processed,
        skipped: state.skipped,
        errors: state.errors,
      },
    };
  } catch (error) {
    logger.warn(
      { error },
      "Procore incremental sync failed, falling back to full"
    );
    yield* procoreFullSync(client, context, options);
  }
}

async function collectAllProjectIds(
  client: ProcoreClient,
  projectFilter: number[]
): Promise<number[]> {
  const ids: number[] = [];
  for await (const projects of listAllProjects(client)) {
    for (const project of projects) {
      if (projectFilter.length > 0 && !projectFilter.includes(project.id)) {
        continue;
      }
      if (project.active) {
        ids.push(project.id);
      }
    }
  }
  return ids;
}

async function* syncUpdatedProjects(
  ctx: IncrementalContext,
  projectFilter: number[]
): AsyncGenerator<ProcoreSyncBatch<GenericDocument>, void, undefined> {
  const { client, context, state, batchSize, filter } = ctx;

  for await (const projects of listAllProjects(client, filter)) {
    for (const project of projects) {
      if (projectFilter.length > 0 && !projectFilter.includes(project.id)) {
        continue;
      }
      if (!project.active) {
        continue;
      }
      try {
        state.documents.push(transformProcoreProject(project, context));
        state.processed += 1;
        state.latestModified = trackModified(
          project.updated_at,
          state.latestModified
        );
      } catch (error) {
        logger.error(
          { error, projectId: project.id },
          "Error transforming Procore project"
        );
        state.errors += 1;
      }
    }
    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }
}

type EntityType = "rfis" | "submittals" | "documents" | "drawings";

async function* syncEntityBatch(
  ctx: IncrementalContext,
  projectId: number,
  entityType: EntityType
): AsyncGenerator<ProcoreSyncBatch<GenericDocument>, void, undefined> {
  const { client, context, state, batchSize, filter } = ctx;
  const fetcher = getEntityFetcher(entityType);
  const transformer = getEntityTransformer(entityType);

  for await (const items of fetcher(client, projectId, filter)) {
    for (const item of items) {
      try {
        state.documents.push(transformer(item, projectId, context));
        state.processed += 1;
        state.latestModified = trackModified(
          (item as { updated_at: string }).updated_at,
          state.latestModified
        );
      } catch (error) {
        logger.error(
          {
            error,
            entityId: (item as { id: number }).id,
            projectId,
            entityType,
          },
          `Error transforming Procore ${entityType}`
        );
        state.errors += 1;
      }
    }
    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }
}

function getEntityFetcher(
  entityType: EntityType
): (
  client: ProcoreClient,
  projectId: number,
  params?: Record<string, string>
) => AsyncGenerator<unknown[], void, undefined> {
  const fetchers: Record<EntityType, typeof listProjectRfis> = {
    rfis: listProjectRfis,
    submittals: listProjectSubmittals,
    documents: listProjectDocuments,
    drawings: listProjectDrawings,
  };
  return fetchers[entityType] as (
    client: ProcoreClient,
    projectId: number,
    params?: Record<string, string>
  ) => AsyncGenerator<unknown[], void, undefined>;
}

function getEntityTransformer(
  entityType: EntityType
): (
  entity: unknown,
  projectId: number,
  context: ProcoreTransformContext
) => GenericDocument {
  const transformers = {
    rfis: transformProcoreRfi,
    submittals: transformProcoreSubmittal,
    documents: transformProcoreDocument,
    drawings: transformProcoreDrawing,
  };
  return transformers[entityType] as (
    entity: unknown,
    projectId: number,
    context: ProcoreTransformContext
  ) => GenericDocument;
}

function makeBatch(
  state: IncrementalState,
  hasMore: boolean
): ProcoreSyncBatch<GenericDocument> {
  return {
    items: state.documents,
    cursor: { lastSyncTime: state.latestModified, lastFullSync: Date.now() },
    hasMore,
    stats: {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
  };
}

function trackModified(updateTime: string, current: number): number {
  const ts = new Date(updateTime).getTime();
  return ts > current ? ts : current;
}
