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
import { phabricatorFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* phabricatorIncrementalSync(
  client: PhabricatorClient,
  context: PhabricatorTransformContext,
  options: PhabricatorSyncOptions = {}
): AsyncGenerator<PhabricatorSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = DEFAULT_BATCH_SIZE,
    syncWikiPages = true,
    syncRepositories = true,
    syncProjects = true,
    onStageChange,
  } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* phabricatorFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "Phabricator incremental sync started"
  );

  const modifiedAfter = Math.floor(cursor.lastSyncTime / 1000);
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  try {
    await onStageChange?.("Syncing updated tasks", processed);

    for await (const tasks of listTasks(client, { modifiedAfter })) {
      for (const task of tasks) {
        try {
          documents.push(await transformTask(task, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, taskId: task.id },
            "Error transforming task in incremental sync"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield createSyncBatch(
          documents,
          {
            lastSyncTime: cursor.lastSyncTime,
            lastFullSync: cursor.lastFullSync,
          },
          true,
          { processed, skipped: 0, errors }
        );
        documents = [];
      }
    }

    await onStageChange?.("Syncing updated revisions", processed);

    for await (const revisions of listRevisions(client, { modifiedAfter })) {
      for (const revision of revisions) {
        try {
          documents.push(await transformRevision(revision, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, revisionId: revision.id },
            "Error transforming revision in incremental sync"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield createSyncBatch(
          documents,
          {
            lastSyncTime: cursor.lastSyncTime,
            lastFullSync: cursor.lastFullSync,
          },
          true,
          { processed, skipped: 0, errors }
        );
        documents = [];
      }
    }

    if (syncWikiPages) {
      for await (const pages of listWikiPages(client, { modifiedAfter })) {
        for (const page of pages) {
          try {
            documents.push(await transformWikiPage(page, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, pageId: page.id },
              "Error transforming wiki page in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    if (syncRepositories) {
      for await (const repos of listRepositories(client, { modifiedAfter })) {
        for (const repo of repos) {
          try {
            documents.push(await transformRepository(repo, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, repoId: repo.id },
              "Error transforming repository in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    if (syncProjects) {
      for await (const projects of listProjects(client, { modifiedAfter })) {
        for (const project of projects) {
          try {
            documents.push(await transformProject(project, context));
            processed += 1;
          } catch (error) {
            logger.error(
              { error, projectId: project.id },
              "Error transforming project in incremental sync"
            );
            errors += 1;
          }
        }
      }
    }

    const newCursor: PhabricatorSyncCursor = {
      lastSyncTime: Date.now(),
      lastFullSync: cursor.lastFullSync,
    };

    yield createSyncBatch(documents, newCursor, false, {
      processed,
      skipped: 0,
      errors,
    });
  } catch (error) {
    logger.warn(
      { error },
      "Phabricator incremental sync failed, falling back to full"
    );
    yield* phabricatorFullSync(client, context, options);
  }
}
