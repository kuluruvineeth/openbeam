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
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* mindtickleFullSync(
  client: MindtickleClient,
  context: MindtickleTransformContext,
  options: MindtickleSyncOptions = {}
): AsyncGenerator<MindtickleSyncBatch<GenericDocument>, void, undefined> {
  const { batchSize = DEFAULT_BATCH_SIZE, onStageChange } = options;

  logger.info(
    { connectorId: client.connectorId },
    "Mindtickle full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: MindtickleSyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
  };

  await onStageChange?.("Syncing courses", state.processed);

  for await (const courses of listCourses(client)) {
    for (const course of courses) {
      try {
        state.documents.push(await transformCourse(course, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, courseId: course.id },
          "Error transforming Mindtickle course"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing modules", state.processed);

  for await (const modules of listModules(client)) {
    for (const mod of modules) {
      try {
        state.documents.push(await transformModule(mod, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, moduleId: mod.id },
          "Error transforming Mindtickle module"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing missions", state.processed);

  for await (const missions of listMissions(client)) {
    for (const mission of missions) {
      try {
        state.documents.push(await transformMission(mission, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, missionId: mission.id },
          "Error transforming Mindtickle mission"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing content", state.processed);

  for await (const contentItems of listContent(client)) {
    for (const item of contentItems) {
      try {
        state.documents.push(await transformContent(item, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, contentId: item.id },
          "Error transforming Mindtickle content"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  logger.info(
    {
      processed: state.processed,
      skipped: state.skipped,
      errors: state.errors,
    },
    "Mindtickle full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
