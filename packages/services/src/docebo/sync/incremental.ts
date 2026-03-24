import type {
  DoceboSyncBatch,
  DoceboSyncCursor,
  DoceboTransformContext,
} from "@openbeam/types/services/connectors/docebo";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listCertificationsUpdatedSince } from "../api/certifications";
import { listCoursesUpdatedSince } from "../api/courses";
import { listEnrollmentsUpdatedSince } from "../api/enrollments";
import { listLearningPlansUpdatedSince } from "../api/learning-plans";
import { listUsersUpdatedSince } from "../api/users";
import type { DoceboClient } from "../client";
import { transformDoceboCertification } from "../transformers/certification";
import { transformDoceboCourse } from "../transformers/course";
import { transformDoceboEnrollment } from "../transformers/enrollment";
import { transformDoceboLearningPlan } from "../transformers/learning-plan";
import { transformDoceboUser } from "../transformers/user";
import { doceboFullSync } from "./full";
import { syncEntity } from "./shared";

type SyncOptions = {
  cursor?: DoceboSyncCursor;
  batchSize?: number;
  syncCourses?: boolean;
  syncLearningPlans?: boolean;
  syncUsers?: boolean;
  syncEnrollments?: boolean;
  syncCertifications?: boolean;
};

export async function* doceboIncrementalSync(
  client: DoceboClient,
  context: DoceboTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<DoceboSyncBatch<GenericDocument>, void, undefined> {
  const { cursor } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* doceboFullSync(client, context, options);
    return;
  }

  const sinceDate = new Date(cursor.lastSyncTime).toISOString();
  const state = {
    documents: [] as GenericDocument[],
    processed: 0,
    errors: 0,
    latestModified: cursor.lastSyncTime,
  };

  try {
    if (options.syncCourses !== false) {
      await syncEntity(
        {
          source: listCoursesUpdatedSince(client, sinceDate),
          transform: transformDoceboCourse,
          context,
          getUpdatedAt: (c) => c.date_last_updated,
          getItemId: (c) => c.id,
          entityName: "course (incremental)",
        },
        state
      );
    }

    if (options.syncLearningPlans !== false) {
      await syncEntity(
        {
          source: listLearningPlansUpdatedSince(client, sinceDate),
          transform: transformDoceboLearningPlan,
          context,
          getUpdatedAt: (lp) => lp.date_last_updated,
          getItemId: (lp) => lp.id,
          entityName: "learning plan (incremental)",
        },
        state
      );
    }

    if (options.syncUsers !== false) {
      await syncEntity(
        {
          source: listUsersUpdatedSince(client, sinceDate),
          transform: transformDoceboUser,
          context,
          getUpdatedAt: (u) => u.date_last_updated,
          getItemId: (u) => u.user_id,
          entityName: "user (incremental)",
        },
        state
      );
    }

    if (options.syncEnrollments !== false) {
      await syncEntity(
        {
          source: listEnrollmentsUpdatedSince(client, sinceDate),
          transform: transformDoceboEnrollment,
          context,
          getUpdatedAt: (e) => e.date_last_updated,
          getItemId: (e) => e.id,
          entityName: "enrollment (incremental)",
        },
        state
      );
    }

    if (options.syncCertifications !== false) {
      await syncEntity(
        {
          source: listCertificationsUpdatedSince(client, sinceDate),
          transform: transformDoceboCertification,
          context,
          getUpdatedAt: (c) => c.date_last_updated,
          getItemId: (c) => c.id,
          entityName: "certification (incremental)",
        },
        state
      );
    }

    yield {
      items: state.documents,
      cursor: {
        lastSyncTime: state.latestModified,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed: state.processed, skipped: 0, errors: state.errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "Docebo incremental sync failed, falling back to full"
    );
    yield* doceboFullSync(client, context, options);
  }
}
