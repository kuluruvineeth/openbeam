import type { Database } from "@openplane/db";
import type {
  CleanupKnowledgeChangesInput,
  CleanupKnowledgeChangesOutput,
} from "./types";

const DOCUMENT_CHANGE_RETENTION_DAYS = 90;
const ENTITY_CHANGE_RETENTION_DAYS = 90;
const ACTIVITY_EVENT_RETENTION_DAYS = 30;

export interface CleanupKnowledgeChangesDependencies {
  db: Database;
}

export function createCleanupKnowledgeChangesActivity(
  deps: CleanupKnowledgeChangesDependencies
) {
  return async function cleanupKnowledgeChanges(
    input: CleanupKnowledgeChangesInput
  ): Promise<CleanupKnowledgeChangesOutput> {
    const now = new Date();

    const docRetention =
      input.documentChangeRetentionDays ?? DOCUMENT_CHANGE_RETENTION_DAYS;
    const entityRetention =
      input.entityChangeRetentionDays ?? ENTITY_CHANGE_RETENTION_DAYS;
    const activityRetention =
      input.activityEventRetentionDays ?? ACTIVITY_EVENT_RETENTION_DAYS;

    const docCutoff = new Date(
      now.getTime() - docRetention * 24 * 60 * 60 * 1000
    );
    const entityCutoff = new Date(
      now.getTime() - entityRetention * 24 * 60 * 60 * 1000
    );
    const activityCutoff = new Date(
      now.getTime() - activityRetention * 24 * 60 * 60 * 1000
    );

    const docResult = await deps.db.documentChange.deleteMany({
      where: { createdAt: { lt: docCutoff } },
    });

    const entityResult = await deps.db.entityChange.deleteMany({
      where: { createdAt: { lt: entityCutoff } },
    });

    const activityResult = await deps.db.activityEvent.deleteMany({
      where: { createdAt: { lt: activityCutoff } },
    });

    return {
      documentChangesDeleted: docResult.count,
      entityChangesDeleted: entityResult.count,
      activityEventsDeleted: activityResult.count,
    };
  };
}
