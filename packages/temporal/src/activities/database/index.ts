import type { Database } from "@openplane/db";
import { createSyncHistory, createSyncJobWithHistory } from "@openplane/db";
import { createCleanupActivities } from "./cleanup";
import { createCompleteSyncJobActivity } from "./complete-sync-job";
import { createEmitSyncStartedActivity } from "./emit-sync-started";
import { createFilterUnchangedDocumentsActivity } from "./filter-unchanged-documents";
import { createLoadConnectorActivity } from "./load-connector";
import { createSetConnectorErrorActivity } from "./set-connector-error";
import { createSetConnectorStatusActivity } from "./set-connector-status";
import { createTrackIndexedDocumentsActivity } from "./track-indexed-documents";
import type {
  CleanupActivities,
  CompleteSyncJobInput,
  ConnectorRecord,
  CreateSyncHistoryInput,
  CreateSyncJobWithHistoryInput,
  DatabaseActivities,
  DiscoveredResource,
  EmitSyncStartedInput,
  TrackIndexedDocumentsInput,
  TrackIndexedDocumentsResult,
  UpdateSyncProgressInput,
  UpsertDiscoveredResourcesInput,
  ValidateConnectionInput,
  ValidateConnectionOutput,
} from "./types";
import { createUpdateSyncProgressActivity } from "./update-sync-progress";
import { createUpsertDiscoveredResourcesActivity } from "./upsert-discovered-resources";
import { createValidateConnectionActivity } from "./validate-connection";

export interface DatabaseActivityDependencies {
  db: Database;
}

export function createDatabaseActivities(
  deps: DatabaseActivityDependencies
): DatabaseActivities {
  const loadConnector = createLoadConnectorActivity(deps);
  const validateConnection = createValidateConnectionActivity(deps);
  const emitSyncStarted = createEmitSyncStartedActivity();
  const updateSyncProgress = createUpdateSyncProgressActivity(deps);
  const completeSyncJob = createCompleteSyncJobActivity(deps);
  const setConnectorError = createSetConnectorErrorActivity(deps);
  const setConnectorStatus = createSetConnectorStatusActivity(deps);
  const trackIndexedDocuments = createTrackIndexedDocumentsActivity(deps);
  const filterUnchangedDocuments = createFilterUnchangedDocumentsActivity(deps);
  const upsertDiscoveredResources =
    createUpsertDiscoveredResourcesActivity(deps);

  return {
    loadConnector,
    validateConnection,
    createSyncHistory: async (input: CreateSyncHistoryInput) =>
      createSyncHistory(deps.db, {
        syncJobId: input.syncJobId,
        connectorId: input.connectorId,
      }),
    createSyncJobWithHistory: async (input: CreateSyncJobWithHistoryInput) =>
      createSyncJobWithHistory(deps.db, input),
    emitSyncStarted,
    updateSyncProgress,
    completeSyncJob,
    setConnectorError,
    setConnectorStatus,
    trackIndexedDocuments,
    filterUnchangedDocuments,
    upsertDiscoveredResources,
  };
}

export { createCleanupActivities };
export {
  createSyncHistoryRecord,
  type RecordBatchIndexedInput,
  recordBatchIndexed,
} from "./sync-history";

export type {
  CleanupActivities,
  CompleteSyncJobInput,
  ConnectorRecord,
  CreateSyncHistoryInput,
  DatabaseActivities,
  DiscoveredResource,
  EmitSyncStartedInput,
  TrackIndexedDocumentsInput,
  TrackIndexedDocumentsResult,
  UpdateSyncProgressInput,
  UpsertDiscoveredResourcesInput,
  ValidateConnectionInput,
  ValidateConnectionOutput,
};
