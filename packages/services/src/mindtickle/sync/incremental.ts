import type {
  MindtickleSyncBatch,
  MindtickleSyncCursor,
  MindtickleSyncOptions,
  MindtickleTransformContext,
} from "@openbeam/types/services/connectors/mindtickle";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listContent } from "../api/content";
import { listCourses } from "../api/courses";
import { listMissions } from "../api/missions";
import { listModules } from "../api/modules";
import type { MindtickleClient } from "../client";
import { transformContent } from "../transformers/content";
import { transformCourse } from "../transformers/course";
import { transformMission } from "../transformers/mission";
import { transformModule } from "../transformers/module";
import { mindtickleFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* mindtickleIncrementalSync(
  client: MindtickleClient,
  context: MindtickleTransformContext,
  options: MindtickleSyncOptions = {}
): AsyncGenerator<MindtickleSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = DEFAULT_BATCH_SIZE, onStageChange } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* mindtickleFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "Mindtickle incremental sync started"
  );

  const updatedSince = new Date(cursor.lastSyncTime).toISOString();
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  try {
    await onStageChange?.("Syncing updated courses", processed);

    for await (const courses of listCourses(client, { updatedSince })) {
      for (const course of courses) {
        try {
          documents.push(await transformCourse(course, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, courseId: course.id },
            "Error transforming course in incremental sync"
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

    await onStageChange?.("Syncing updated modules", processed);

    for await (const modules of listModules(client, { updatedSince })) {
      for (const mod of modules) {
        try {
          documents.push(await transformModule(mod, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, moduleId: mod.id },
            "Error transforming module in incremental sync"
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

    await onStageChange?.("Syncing updated missions", processed);

    for await (const missions of listMissions(client, { updatedSince })) {
      for (const mission of missions) {
        try {
          documents.push(await transformMission(mission, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, missionId: mission.id },
            "Error transforming mission in incremental sync"
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

    await onStageChange?.("Syncing updated content", processed);

    for await (const contentItems of listContent(client, { updatedSince })) {
      for (const item of contentItems) {
        try {
          documents.push(await transformContent(item, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, contentId: item.id },
            "Error transforming content in incremental sync"
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

    const newCursor: MindtickleSyncCursor = {
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
      "Mindtickle incremental sync failed, falling back to full"
    );
    yield* mindtickleFullSync(client, context, options);
  }
}
