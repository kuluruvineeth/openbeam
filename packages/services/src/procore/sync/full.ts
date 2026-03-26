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

type SyncState = {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
  latestModified: number;
};

type EntitySyncParams = {
  client: ProcoreClient;
  context: ProcoreTransformContext;
  projectId: number;
  state: SyncState;
  batchSize: number;
};

export async function* procoreFullSync(
  client: ProcoreClient,
  context: ProcoreTransformContext,
  options: {
    batchSize?: number;
    syncDocuments?: boolean;
    syncDrawings?: boolean;
    projectFilter?: number[];
  } = {}
): AsyncGenerator<ProcoreSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const syncDocuments = options.syncDocuments ?? true;
  const syncDrawings = options.syncDrawings ?? true;
  const projectFilter = options.projectFilter ?? [];

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
    latestModified: 0,
  };

  const projectIds: number[] = [];

  for await (const projects of listAllProjects(client)) {
    for (const project of projects) {
      if (projectFilter.length > 0 && !projectFilter.includes(project.id)) {
        continue;
      }
      if (!project.active) {
        continue;
      }

      projectIds.push(project.id);

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

  for (const projectId of projectIds) {
    const params: EntitySyncParams = {
      client,
      context,
      projectId,
      state,
      batchSize,
    };

    yield* syncRfis(params);
    yield* syncSubmittals(params);

    if (syncDocuments) {
      yield* syncDocuments_(params);
    }
    if (syncDrawings) {
      yield* syncDrawings_(params);
    }
  }

  const cursor: ProcoreSyncCursor = {
    lastSyncTime: state.latestModified || Date.now(),
    lastFullSync: Date.now(),
  };

  yield {
    items: state.documents,
    cursor,
    hasMore: false,
    stats: {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
  };
}

async function* syncRfis(
  params: EntitySyncParams
): AsyncGenerator<ProcoreSyncBatch<GenericDocument>, void, undefined> {
  const { client, context, projectId, state, batchSize } = params;

  for await (const rfis of listProjectRfis(client, projectId)) {
    for (const rfi of rfis) {
      try {
        state.documents.push(transformProcoreRfi(rfi, projectId, context));
        state.processed += 1;
        state.latestModified = trackModified(
          rfi.updated_at,
          state.latestModified
        );
      } catch (error) {
        logger.error(
          { error, rfiId: rfi.id, projectId },
          "Error transforming Procore RFI"
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

async function* syncSubmittals(
  params: EntitySyncParams
): AsyncGenerator<ProcoreSyncBatch<GenericDocument>, void, undefined> {
  const { client, context, projectId, state, batchSize } = params;

  for await (const submittals of listProjectSubmittals(client, projectId)) {
    for (const submittal of submittals) {
      try {
        state.documents.push(
          transformProcoreSubmittal(submittal, projectId, context)
        );
        state.processed += 1;
        state.latestModified = trackModified(
          submittal.updated_at,
          state.latestModified
        );
      } catch (error) {
        logger.error(
          { error, submittalId: submittal.id, projectId },
          "Error transforming Procore submittal"
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

async function* syncDocuments_(
  params: EntitySyncParams
): AsyncGenerator<ProcoreSyncBatch<GenericDocument>, void, undefined> {
  const { client, context, projectId, state, batchSize } = params;

  for await (const docs of listProjectDocuments(client, projectId)) {
    for (const doc of docs) {
      try {
        state.documents.push(transformProcoreDocument(doc, projectId, context));
        state.processed += 1;
        state.latestModified = trackModified(
          doc.updated_at,
          state.latestModified
        );
      } catch (error) {
        logger.error(
          { error, documentId: doc.id, projectId },
          "Error transforming Procore document"
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

async function* syncDrawings_(
  params: EntitySyncParams
): AsyncGenerator<ProcoreSyncBatch<GenericDocument>, void, undefined> {
  const { client, context, projectId, state, batchSize } = params;

  for await (const drawings of listProjectDrawings(client, projectId)) {
    for (const drawing of drawings) {
      try {
        state.documents.push(
          transformProcoreDrawing(drawing, projectId, context)
        );
        state.processed += 1;
        state.latestModified = trackModified(
          drawing.updated_at,
          state.latestModified
        );
      } catch (error) {
        logger.error(
          { error, drawingId: drawing.id, projectId },
          "Error transforming Procore drawing"
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

function makeBatch(
  state: SyncState,
  hasMore: boolean
): ProcoreSyncBatch<GenericDocument> {
  return {
    items: state.documents,
    cursor: {
      lastSyncTime: state.latestModified || Date.now(),
      lastFullSync: Date.now(),
    },
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
