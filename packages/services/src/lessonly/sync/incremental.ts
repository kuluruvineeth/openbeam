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
import { lessonlyFullSync } from "./full";
import { createSyncBatch } from "./utils";

const DEFAULT_BATCH_SIZE = 50;

export async function* lessonlyIncrementalSync(
  client: LessonlyClient,
  context: LessonlyTransformContext,
  options: LessonlySyncOptions = {}
): AsyncGenerator<LessonlySyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = DEFAULT_BATCH_SIZE, onStageChange } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* lessonlyFullSync(client, context, options);
    return;
  }

  logger.info(
    { connectorId: client.connectorId, lastSyncTime: cursor.lastSyncTime },
    "Lessonly incremental sync started"
  );

  const updatedSince = new Date(cursor.lastSyncTime).toISOString();
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;

  try {
    await onStageChange?.("Syncing updated lessons", processed);
    for await (const lessons of listLessons(client, { updatedSince })) {
      for (const lesson of lessons) {
        try {
          documents.push(await transformLesson(lesson, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, lessonId: lesson.id },
            "Error transforming lesson in incremental sync"
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

    await onStageChange?.("Syncing updated paths", processed);
    for await (const paths of listPaths(client, { updatedSince })) {
      for (const path of paths) {
        try {
          documents.push(await transformPath(path, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, pathId: path.id },
            "Error transforming path in incremental sync"
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

    await onStageChange?.("Syncing updated assignments", processed);
    for await (const assignments of listAssignments(client, { updatedSince })) {
      for (const assignment of assignments) {
        try {
          documents.push(await transformAssignment(assignment, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, assignmentId: assignment.id },
            "Error transforming assignment in incremental sync"
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

    for await (const groups of listGroups(client, { updatedSince })) {
      for (const group of groups) {
        try {
          documents.push(await transformGroup(group, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, groupId: group.id },
            "Error transforming group in incremental sync"
          );
          errors += 1;
        }
      }
    }

    for await (const users of listUsers(client, { updatedSince })) {
      for (const user of users) {
        try {
          documents.push(await transformUser(user, context));
          processed += 1;
        } catch (error) {
          logger.error(
            { error, userId: user.id },
            "Error transforming user in incremental sync"
          );
          errors += 1;
        }
      }
    }

    const newCursor: LessonlySyncCursor = {
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
      "Lessonly incremental sync failed, falling back to full"
    );
    yield* lessonlyFullSync(client, context, options);
  }
}
