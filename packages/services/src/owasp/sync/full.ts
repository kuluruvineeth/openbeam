import type {
  OwaspProject,
  OwaspSyncBatch,
  OwaspSyncCursor,
  OwaspSyncOptions,
  OwaspTransformContext,
} from "@openbeam/types/services/connectors/owasp";
import { OWASP_REPOS } from "@openbeam/types/services/connectors/owasp";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { fetchAllMarkdownFiles } from "../api/github";
import type { OwaspClient } from "../client";
import { transformOwaspDocument } from "../transformers/document";

const DEFAULT_BATCH_SIZE = 20;

const ALL_PROJECTS: OwaspProject[] = Object.keys(OWASP_REPOS) as OwaspProject[];

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

function createBatch(
  items: GenericDocument[],
  cursor: OwaspSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): OwaspSyncBatch<GenericDocument> {
  return { items, cursor: { ...cursor }, hasMore, stats };
}

export async function* fullSync(
  client: OwaspClient,
  context: Omit<OwaspTransformContext, "project">,
  options: OwaspSyncOptions = {}
): AsyncGenerator<OwaspSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    projects = ALL_PROJECTS,
    onStageChange,
  } = options;

  logger.info({ projects }, "OWASP full sync started");

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: OwaspSyncCursor = {
    lastSyncTime: Date.now(),
    projectsCompleted: [],
    documentsProcessed: 0,
  };

  for (const project of projects) {
    await onStageChange?.(`Syncing OWASP ${project}`, state.processed, project);

    const transformContext: OwaspTransformContext = { ...context, project };

    try {
      for await (const doc of fetchAllMarkdownFiles(client, project)) {
        try {
          const document = transformOwaspDocument(doc, transformContext);
          state.documents.push(document);
          state.processed += 1;

          if (state.documents.length >= batchSize) {
            cursor.documentsProcessed = state.processed;
            yield createBatch(state.documents, cursor, true, state);
            state.documents = [];
          }
        } catch (error) {
          logger.error(
            { error, project, path: doc.path },
            "Error transforming OWASP document"
          );
          state.errors += 1;
        }
      }
    } catch (error) {
      logger.error({ error, project }, "Error fetching OWASP project");
      state.errors += 1;
    }

    cursor.projectsCompleted = [...(cursor.projectsCompleted ?? []), project];
  }

  cursor.documentsProcessed = state.processed;

  logger.info(
    { processed: state.processed, errors: state.errors },
    "OWASP full sync complete"
  );

  if (state.documents.length > 0) {
    yield createBatch(state.documents, cursor, false, state);
  }
}
