import type { Database } from "@openbeam/db";
import {
  createConnectorDownloadActivity,
  type DownloadActivityDependencies,
} from "./download";
import { createFetchBatchActivity, type SyncGenerator } from "./fetch-batch";
import { createLoadConnectorActivity } from "./load-connector";
import {
  createUnifiedFetchBatchActivity,
  type UnifiedSyncDependencies,
} from "./unified-fetch-batch";

export interface ConnectorActivityDependencies {
  db: Database;
}

export interface ConnectorFileActivityDependencies
  extends DownloadActivityDependencies {}

export function createBaseConnectorActivities(
  deps: ConnectorActivityDependencies
) {
  return createLoadConnectorActivity(deps);
}

export function createConnectorSyncActivities(
  connectorType: string,
  syncFn: SyncGenerator
) {
  return createFetchBatchActivity(connectorType, syncFn);
}

export function createUnifiedSyncActivities(deps: UnifiedSyncDependencies) {
  return createUnifiedFetchBatchActivity(deps);
}

export function createConnectorFileActivities(
  deps: ConnectorFileActivityDependencies
) {
  return {
    downloadFile: createConnectorDownloadActivity(deps),
  };
}

export {
  downloadGenericFile,
  downloadGmailFile,
  downloadGoogleDriveFile,
  downloadSlackFile,
} from "./download";
export type { SyncGenerator } from "./fetch-batch";
export { registerAllSyncFactories } from "./sync-registry";
export type {
  BaseConnectorActivities,
  ConnectorFileActivities,
  ConnectorRecord,
  ConnectorSyncActivities,
  DownloadFileInput,
  DownloadFileOutput,
  FetchBatchInput,
  FetchBatchOutput,
} from "./types";
export { clearGeneratorCache } from "./unified-fetch-batch";
