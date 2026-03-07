import type { ExecutionTrace } from "@openbeam/types/canvas";
import type {
  CanvasApprovalSignalPayload,
  CanvasInputSignalPayload,
} from "@openbeam/types/temporal";
import { defineQuery, defineSignal } from "@temporalio/workflow";

export interface CanvasExecutionQueryState {
  executionId: string;
  status: ExecutionTrace["status"];
  currentNodeId: string | undefined;
  stepsCompleted: number;
  stepsTotal: number;
  isPaused: boolean;
  isCancelled: boolean;
  startedAt: number;
  droppedSignals: number;
  totalNodeExecutions: number;
  continueAsNewCount: number;
  steps: Array<{
    nodeId: string;
    nodeType: string;
    status: string;
    startedAt?: number;
    completedAt?: number;
    error?: string;
  }>;
}

export type SyncCursor = Record<string, unknown>;

export interface ConnectorSyncInput {
  connectorId: string;
  syncHistoryId?: string;
  syncType: "FULL" | "INCREMENTAL" | "PERMISSIONS";
  trigger: "SCHEDULE" | "MANUAL" | "WEBHOOK";
  cursor?: SyncCursor;
}

export interface ConnectorSyncOutput {
  processed: number;
  indexed: number;
  errors: number;
  finalCursor: SyncCursor;
  duration: number;
}

export interface SyncState {
  processed: number;
  indexed: number;
  errors: number;
  dataAdded: number;
  dataUpdated: number;
  dataDeleted: number;
  cursor?: SyncCursor;
  stage: string;
  progressMessage?: string;
  batchNumber?: number;
  cancelled?: boolean;
  isPaused?: boolean;
}

export interface FileProcessingInput {
  connectorId: string;
  externalId: string;
  mimeType: string;
  downloadUrl?: string;
  metadata?: {
    filename?: string;
    messageId?: string;
    attachmentId?: string;
    downloadUrl?: string;
    [key: string]: string | undefined;
  };
}

export interface FileProcessingOutput {
  documentId: string;
  chunks: number;
  indexed: boolean;
}

export interface MediaProcessingInput {
  connectorId: string;
  mediaId: string;
  mediaType: "video" | "audio";
  sourceUrl: string;
}

export interface MediaProcessingOutput {
  mediaId: string;
  segments: number;
  duration: number;
}

export interface WebhookInput {
  connectorId: string;
  connectorType: string;
  eventId: string;
  eventType: string;
  payload: unknown;
  signature: string;
  receivedAt: number;
}

export interface WebhookOutput {
  eventId?: string;
  action?: string;
  processed: boolean;
  success: boolean;
  error?: string;
}

export interface BackgroundAgentInput {
  sessionId: string;
  agentType: string;
  initialPrompt: string;
  context: Record<string, unknown>;
  maxSteps: number;
}

export interface AgentArtifact {
  id: string;
  type: string;
  content: unknown;
  summary?: string;
  createdAt: number;
}

export interface AgentCheckpoint {
  step: number;
  state: Record<string, unknown>;
  timestamp: number;
}

export interface BackgroundAgentOutput {
  sessionId: string;
  steps: number;
  artifacts: AgentArtifact[];
  status: "completed" | "cancelled" | "error";
}

export interface AgentState {
  steps: number;
  artifacts: AgentArtifact[];
  status: "running" | "completed" | "cancelled" | "error";
  lastCheckpoint: AgentCheckpoint | null;
  config?: Record<string, unknown>;
}

export interface CleanupInput {
  type: "DAILY" | "DELETION_SYNC";
  teamId?: string;
}

export interface CleanupOutput {
  staleDeleted: number;
  orphansRemoved: number;
  errors: string[];
}

export interface ConnectorCleanupInput {
  connectorId: string;
  teamId: string;
  scheduledAt: number;
}

export interface ConnectorCleanupOutput {
  connectorId: string;
  status: "completed" | "cancelled";
}

export interface IndexDocumentsInput {
  documents: unknown[];
  connectorId: string;
  syncHistoryId?: string;
  batchSize?: number;
}

export interface IndexDocumentsOutput {
  indexed: number;
  errors: number;
  total: number;
  skipped: number;
  dataAdded: number;
  dataUpdated: number;
  dataDeleted: number;
  success: boolean;
}

export interface DigestDeliveryInput {
  subscriptionId: string;
  connectorId: string;
  userId: string;
  slackUserId: string;
  teamId: string;
  channelIds: string[];
  topics: string[];
  deliveryTime: string;
  timezone: string;
  frequency: "daily" | "weekly";
}

export interface DigestDeliveryOutput {
  subscriptionId: string;
  delivered: boolean;
  messageTs?: string;
  error?: string;
}

export interface ReembedInput {
  connectorId: string;
  batchSize?: number;
  fromVersion?: number;
}

export interface ReembedOutput {
  processed: number;
  updated: number;
  errors: number;
}

export interface EntityExtractionInput {
  connectorId: string;
  documentIds?: string[];
  batchSize?: number;
}

export interface EntityExtractionOutput {
  documentsProcessed: number;
  entitiesExtracted: number;
  errors: number;
}

export interface ProfileUpdateInput {
  userId: string;
  teamId: string;
  updateType: "signals" | "preferences" | "full";
}

export interface ProfileUpdateOutput {
  userId: string;
  updated: boolean;
  signalsProcessed?: number;
}

export interface LtrTrainingInput {
  teamId: string;
  modelVersion?: string;
  minSamples?: number;
}

export interface LtrTrainingOutput {
  modelId: string;
  samplesUsed: number;
  accuracy: number;
  deployedAt?: number;
}

export interface AnalyticsExportInput {
  teamId: string;
  exportType: "daily" | "weekly" | "monthly";
  startDate: number;
  endDate: number;
}

export interface AnalyticsExportOutput {
  exportId: string;
  recordCount: number;
  storagePath: string;
}

export interface EmergenceDetectionInput {
  teamId?: string;
  analysisType?: "weekly" | "aggregation" | "validation";
  dateRange?: {
    start: number;
    end: number;
  };
  minFrequency?: number;
  minSuccessRate?: number;
}

export interface EmergenceDetectionOutput {
  patternsAnalyzed: number;
  newPatterns: number;
  validatedPatterns: number;
  formalizationCandidates: string[];
}

export const progressQuery = defineQuery<SyncState>("progress");
export const agentProgressQuery = defineQuery<AgentState>("agentProgress");
export const artifactsQuery = defineQuery<AgentArtifact[]>("artifacts");
export const canvasExecutionQuery =
  defineQuery<CanvasExecutionQueryState>("canvasExecution");
export const cancelSignal = defineSignal("cancel");
export const pauseSignal = defineSignal("pause");
export const resumeSignal = defineSignal("resume");
export const skipGracePeriodSignal = defineSignal("skipGracePeriod");
export const updateConfigSignal =
  defineSignal<[Record<string, unknown>]>("updateConfig");
export const canvasApprovalSignal =
  defineSignal<[CanvasApprovalSignalPayload]>("canvasApproval");
export const canvasInputSignal =
  defineSignal<[CanvasInputSignalPayload]>("canvasInput");
