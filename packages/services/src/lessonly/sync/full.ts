import type {
  LessonlySyncBatch,
  LessonlySyncCursor,
  LessonlySyncOptions,
  LessonlyTransformContext,
} from "@openbeam/types/services/connectors/lessonly";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAssignments } from "../api/assignments";
import { listGroups } from "../api/groups";
import { listLessons } from "../api/lessons";
import { listPaths } from "../api/paths";
import { listUsers } from "../api/users";
import type { LessonlyClient } from "../client";
import { transformAssignment } from "../transformers/assignment";
import { transformGroup } from "../transformers/group";
import { transformLesson } from "../transformers/lesson";
import { transformPath } from "../transformers/path";
import { transformUser } from "../transformers/user";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

interface SyncState {
  documents: GenericDocument[];
  processed: number;
  skipped: number;
  errors: number;
}

export async function* lessonlyFullSync(
  client: LessonlyClient,
  context: LessonlyTransformContext,
  options: LessonlySyncOptions = {}
): AsyncGenerator<LessonlySyncBatch<GenericDocument>, void, undefined> {
  const { batchSize = DEFAULT_BATCH_SIZE, onStageChange } = options;

  logger.info(
    { connectorId: client.connectorId },
    "Lessonly full sync started"
  );

  const state: SyncState = {
    documents: [],
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  const cursor: LessonlySyncCursor = {
    lastSyncTime: Date.now(),
    lastFullSync: Date.now(),
  };

  await onStageChange?.("Syncing lessons", state.processed);
  for await (const lessons of listLessons(client)) {
    for (const lesson of lessons) {
      try {
        state.documents.push(await transformLesson(lesson, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, lessonId: lesson.id },
          "Error transforming lesson"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing learning paths", state.processed);
  for await (const paths of listPaths(client)) {
    for (const path of paths) {
      try {
        state.documents.push(await transformPath(path, context));
        state.processed += 1;
      } catch (error) {
        logger.error({ error, pathId: path.id }, "Error transforming path");
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing assignments", state.processed);
  for await (const assignments of listAssignments(client)) {
    for (const assignment of assignments) {
      try {
        state.documents.push(await transformAssignment(assignment, context));
        state.processed += 1;
      } catch (error) {
        logger.error(
          { error, assignmentId: assignment.id },
          "Error transforming assignment"
        );
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing groups", state.processed);
  for await (const groups of listGroups(client)) {
    for (const group of groups) {
      try {
        state.documents.push(await transformGroup(group, context));
        state.processed += 1;
      } catch (error) {
        logger.error({ error, groupId: group.id }, "Error transforming group");
        state.errors += 1;
      }
    }

    if (state.documents.length >= batchSize) {
      yield createSyncBatch(state.documents, cursor, true, state);
      state.documents = [];
    }
  }

  await onStageChange?.("Syncing users", state.processed);
  for await (const users of listUsers(client)) {
    for (const user of users) {
      try {
        state.documents.push(await transformUser(user, context));
        state.processed += 1;
      } catch (error) {
        logger.error({ error, userId: user.id }, "Error transforming user");
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
    "Lessonly full sync complete"
  );

  yield createSyncBatch(state.documents, cursor, false, state);
}
