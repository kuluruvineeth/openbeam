import type { ConnectorStatus, SyncJobStatus } from "@openbeam/db";
import type { CheckStatus, HealthStatus } from "@openbeam/services";
import type { GenericDocument } from "@openbeam/vespa";
import type { ConnectorRecord } from "../connectors/types";

export type { ConnectorRecord };

export interface ValidateConnectionInput {
  connectorId: string;
  teamId: string;
  failOnDegraded?: boolean;
}

export interface ValidateConnectionCheck {
  name: string;
  status: CheckStatus;
  message?: string;
  latencyMs?: number;
}

export interface ValidateConnectionOutput {
  valid: boolean;
  status: HealthStatus;
  message?: string;
  canProceed: boolean;
  checks?: ValidateConnectionCheck[];
}

export interface TrackIndexedDocumentsInput {
  documents: GenericDocument[];
  connectorId: string;
  syncHistoryId?: string;
}

export interface TrackIndexedDocumentsResult {
  tracked: number;
  dataAdded: number;
  dataUpdated: number;
}

export interface DeleteIndexedDocumentsInput {
  connectorId: string;
  externalIds: string[];
}

export interface DeleteIndexedDocumentsResult {
  deleted: number;
}

export type SyncStage =
  | "INITIALIZING"
  | "FETCHING"
  | "TRANSFORMING"
  | "INDEXING"
  | "FINALIZING"
  | "COMPLETED"
  | "FAILED";

export interface UpdateSyncProgressInput {
  workflowId: string;
  connectorId: string;
  syncHistoryId: string;
  teamId: string;
  connectorName: string;
  processed: number;
  indexed: number;
  errors: number;
  total: number;
  cursor?: string;
  stage: SyncStage;
  progressMessage?: string;
}

export interface CompleteSyncJobInput {
  workflowId: string;
  connectorId: string;
  syncHistoryId: string;
  status: SyncJobStatus;
  cursor?: string;
  stats: {
    processed: number;
    indexed: number;
    errors: number;
    dataAdded: number;
    dataUpdated: number;
    dataDeleted: number;
    durationMs: number;
  };
  errorMessage?: string;
}

export interface CreateSyncHistoryInput {
  connectorId: string;
  syncJobId: string;
}

export interface CreateSyncJobWithHistoryInput {
  connectorId: string;
  syncType: "FULL" | "INCREMENTAL" | "PERMISSIONS";
  trigger: "SCHEDULED" | "MANUAL" | "WEBHOOK";
}

export interface CreateSyncJobWithHistoryResult {
  syncJobId: string;
  syncHistoryId: string;
}

export interface EmitSyncStartedInput {
  workflowId: string;
  syncHistoryId: string;
  connectorId: string;
  teamId: string;
  connectorName: string;
}

export interface RecordSyncDocumentChangesInput {
  connectorId: string;
  documentIds: string[];
  changeType: "CREATED" | "UPDATED" | "DELETED";
  syncHistoryId?: string;
}

export interface DatabaseActivities {
  loadConnector(connectorId: string): Promise<ConnectorRecord>;
  validateConnection(
    input: ValidateConnectionInput
  ): Promise<ValidateConnectionOutput>;
  createSyncHistory(input: CreateSyncHistoryInput): Promise<{ id: string }>;
  createSyncJobWithHistory(
    input: CreateSyncJobWithHistoryInput
  ): Promise<CreateSyncJobWithHistoryResult>;
  emitSyncStarted(input: EmitSyncStartedInput): Promise<void>;
  updateSyncProgress(input: UpdateSyncProgressInput): Promise<void>;
  completeSyncJob(input: CompleteSyncJobInput): Promise<void>;
  setConnectorError(input: {
    connectorId: string;
    error: string;
  }): Promise<void>;
  setConnectorStatus(input: {
    connectorId: string;
    status: ConnectorStatus;
  }): Promise<void>;
  trackIndexedDocuments(
    input: TrackIndexedDocumentsInput
  ): Promise<TrackIndexedDocumentsResult>;
  deleteIndexedDocuments(
    input: DeleteIndexedDocumentsInput
  ): Promise<DeleteIndexedDocumentsResult>;
  filterUnchangedDocuments(
    input: FilterUnchangedInput
  ): Promise<FilterUnchangedResult>;
  upsertDiscoveredResources(
    input: UpsertDiscoveredResourcesInput
  ): Promise<{ upserted: number }>;
  recordSyncDocumentChanges(
    input: RecordSyncDocumentChangesInput
  ): Promise<{ recorded: number }>;
}

export interface FilterUnchangedInput {
  documents: GenericDocument[];
  connectorId: string;
}

export interface FilterUnchangedResult {
  changedDocuments: GenericDocument[];
  skipped: number;
}

export interface DiscoveredResource {
  connectorId: string;
  externalId: string;
  resourceType: string;
  name?: string;
  path?: string;
  parentId?: string;
  syncEnabled?: boolean;
  syncPriority?: number;
  isPublic?: boolean;
  accessControl?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpsertDiscoveredResourcesInput {
  resources: DiscoveredResource[];
}

export interface CleanupActivities {
  removeStaleDocuments(input: {
    teamId: string;
    olderThanMs: number;
  }): Promise<{ deleted: number }>;
  getTeamConnectorIds(input: { teamId: string }): Promise<string[]>;
  deleteConnectorRecord(input: { connectorId: string }): Promise<void>;
}
