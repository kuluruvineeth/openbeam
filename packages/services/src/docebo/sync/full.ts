import type {
  DoceboSyncBatch,
  DoceboTransformContext,
} from "@openbeam/types/services/connectors/docebo";
import type { GenericDocument } from "@openbeam/vespa";
import { listAllCertifications } from "../api/certifications";
import { listAllCourses } from "../api/courses";
import { listAllEnrollments } from "../api/enrollments";
import { listAllLearningPlans } from "../api/learning-plans";
import { listAllUsers } from "../api/users";
import type { DoceboClient } from "../client";
import { transformDoceboCertification } from "../transformers/certification";
import { transformDoceboCourse } from "../transformers/course";
import { transformDoceboEnrollment } from "../transformers/enrollment";
import { transformDoceboLearningPlan } from "../transformers/learning-plan";
import { transformDoceboUser } from "../transformers/user";
import { syncEntity } from "./shared";

type SyncOptions = {
  batchSize?: number;
  syncCourses?: boolean;
  syncLearningPlans?: boolean;
  syncUsers?: boolean;
  syncEnrollments?: boolean;
  syncCertifications?: boolean;
};

export async function* doceboFullSync(
  client: DoceboClient,
  context: DoceboTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<DoceboSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const state = {
    documents: [] as GenericDocument[],
    processed: 0,
    errors: 0,
    latestModified: 0,
  };

  if (options.syncCourses !== false) {
    await syncEntity(
      {
        source: listAllCourses(client),
        transform: transformDoceboCourse,
        context,
        getUpdatedAt: (c) => c.date_last_updated,
        getItemId: (c) => c.id,
        entityName: "course",
      },
      state
    );
    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }

  if (options.syncLearningPlans !== false) {
    await syncEntity(
      {
        source: listAllLearningPlans(client),
        transform: transformDoceboLearningPlan,
        context,
        getUpdatedAt: (lp) => lp.date_last_updated,
        getItemId: (lp) => lp.id,
        entityName: "learning plan",
      },
      state
    );
    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }

  if (options.syncUsers !== false) {
    await syncEntity(
      {
        source: listAllUsers(client),
        transform: transformDoceboUser,
        context,
        getUpdatedAt: (u) => u.date_last_updated,
        getItemId: (u) => u.user_id,
        entityName: "user",
      },
      state
    );
    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }

  if (options.syncEnrollments !== false) {
    await syncEntity(
      {
        source: listAllEnrollments(client),
        transform: transformDoceboEnrollment,
        context,
        getUpdatedAt: (e) => e.date_last_updated,
        getItemId: (e) => e.id,
        entityName: "enrollment",
      },
      state
    );
    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }

  if (options.syncCertifications !== false) {
    await syncEntity(
      {
        source: listAllCertifications(client),
        transform: transformDoceboCertification,
        context,
        getUpdatedAt: (c) => c.date_last_updated,
        getItemId: (c) => c.id,
        entityName: "certification",
      },
      state
    );
  }

  yield {
    items: state.documents,
    cursor: {
      lastSyncTime: state.latestModified || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore: false,
    stats: { processed: state.processed, skipped: 0, errors: state.errors },
  };
}

function makeBatch(
  state: {
    documents: GenericDocument[];
    processed: number;
    errors: number;
    latestModified: number;
  },
  hasMore: boolean
): DoceboSyncBatch<GenericDocument> {
  return {
    items: state.documents,
    cursor: {
      lastSyncTime: state.latestModified || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore,
    stats: { processed: state.processed, skipped: 0, errors: state.errors },
  };
}
