import type {
  PhabricatorSyncBatch,
  PhabricatorSyncCursor,
  PhabricatorSyncOptions,
  PhabricatorTransformContext,
} from "@openbeam/types/services/connectors/phabricator";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listProjects } from "../api/projects";
import { listRepositories } from "../api/repositories";
import { listRevisions } from "../api/revisions";
import { listTasks } from "../api/tasks";
import { listWikiPages } from "../api/wiki-pages";
import type { PhabricatorClient } from "../client";
import { transformProject } from "../transformers/project";
import { transformRepository } from "../transformers/repository";
import { transformRevision } from "../transformers/revision";
import { transformTask } from "../transformers/task";
import { transformWikiPage } from "../transformers/wiki-page";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* phabricatorFullSync(
  client: PhabricatorClient,
  context: PhabricatorTransformContext,
  options: PhabricatorSyncOptions = {}
): AsyncGenerator<PhabricatorSyncBatch<GenericDocument>, void, undefined> {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    syncWikiPages = true,
    syncRepositories = true,
    syncProjects = true,
    onStageChange,
  } = options;

  logger.info(
    {
      connectorId: client.connectorId,
      syncWikiPages,
      syncRepositories,
      syncProjects,
    },
    "Phabricator full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: PhabricatorSyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
  };

  await onStageChange?.("Syncing tasks", state.processed);

  for await (const tasks of listTasks(client)) {
    for (const task of tasks) {
      try {
        state.documents.push(await transformTask(task, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, taskId: task.id },
          "Error transforming Phabricator task"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing revisions", state.processed);

  for await (const revisions of listRevisions(client)) {
    for (const revision of revisions) {
      try {
        state.documents.push(await transformRevision(revision, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, revisionId: revision.id },
          "Error transforming Phabricator revision"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  if (syncWikiPages) {
    await onStageChange?.("Syncing wiki pages", state.processed);

    for await (const pages of listWikiPages(client)) {
      for (const page of pages) {
        try {
          state.documents.push(await transformWikiPage(page, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, pageId: page.id },
            "Error transforming Phabricator wiki page"
          );
          state.errors += 1;
        }
      }

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    }
  }

  if (syncRepositories) {
    await onStageChange?.("Syncing repositories", state.processed);

    for await (const repos of listRepositories(client)) {
      for (const repo of repos) {
        try {
          state.documents.push(await transformRepository(repo, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, repoId: repo.id },
            "Error transforming Phabricator repository"
          );
          state.errors += 1;
        }
      }

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    }
  }

  if (syncProjects) {
    await onStageChange?.("Syncing projects", state.processed);

    for await (const projects of listProjects(client)) {
      for (const project of projects) {
        try {
          state.documents.push(await transformProject(project, context));
          state.processed += 1;
        } catch (error) {
          logger.error(
            { error, projectId: project.id },
            "Error transforming Phabricator project"
          );
          state.errors += 1;
        }
      }

      if (state.documents.length >= batchSize) {
        yield createSyncBatch(state.documents, cursor, true, state);
        state.documents = [];
      }
    }
  }

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Phabricator full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
