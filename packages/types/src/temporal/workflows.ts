import { z } from "zod";
import { ExecutionStatusSchema } from "../canvas/execution";
import { CanvasStateSchema } from "../canvas/state";

export const SyncCursorSchema = z.object({
  pageToken: z.string().optional(),
  historyId: z.string().optional(),
  lastFullSync: z.number().optional(),
  documentIds: z.array(z.string()).optional(),
});

export type SyncCursor = z.infer<typeof SyncCursorSchema>;

export const ConnectorSyncInputSchema = z.object({
  connectorId: z.string(),
  syncType: z.enum(["FULL", "INCREMENTAL", "PERMISSIONS"]),
  trigger: z.enum(["SCHEDULE", "MANUAL", "WEBHOOK"]),
  cursor: SyncCursorSchema.optional(),
  syncHistoryId: z.string().optional(),
  accumulatedStats: z
    .object({
      processed: z.number(),
      indexed: z.number(),
      errors: z.number(),
      dataAdded: z.number(),
      dataUpdated: z.number(),
      dataDeleted: z.number(),
    })
    .optional(),
});

export type ConnectorSyncInput = z.infer<typeof ConnectorSyncInputSchema>;

export const ConnectorSyncOutputSchema = z.object({
  processed: z.number(),
  indexed: z.number(),
  errors: z.number(),
  finalCursor: SyncCursorSchema,
  duration: z.number(),
});

export type ConnectorSyncOutput = z.infer<typeof ConnectorSyncOutputSchema>;

export const FileProcessingInputSchema = z.object({
  connectorId: z.string(),
  externalId: z.string(),
  mimeType: z.string(),
  downloadUrl: z.string().optional(),
  metadata: z.record(z.string(), z.string().optional()).optional(),
});

export type FileProcessingInput = z.infer<typeof FileProcessingInputSchema>;

export const FileProcessingOutputSchema = z.object({
  documentId: z.string(),
  chunks: z.number(),
  indexed: z.boolean(),
});

export type FileProcessingOutput = z.infer<typeof FileProcessingOutputSchema>;

export const MediaProcessingInputSchema = z.object({
  connectorId: z.string(),
  mediaId: z.string(),
  mediaType: z.enum(["video", "audio"]),
  sourceUrl: z.string(),
});

export type MediaProcessingInput = z.infer<typeof MediaProcessingInputSchema>;

export const MediaProcessingOutputSchema = z.object({
  mediaId: z.string(),
  segments: z.number(),
  duration: z.number(),
});

export type MediaProcessingOutput = z.infer<typeof MediaProcessingOutputSchema>;

export const WebhookInputSchema = z.object({
  connectorId: z.string(),
  connectorType: z.string(),
  eventId: z.string(),
  eventType: z.string(),
  payload: z.unknown(),
  signature: z.string(),
  receivedAt: z.number(),
});

export type WebhookInput = z.infer<typeof WebhookInputSchema>;

export const WebhookOutputSchema = z.object({
  eventId: z.string().optional(),
  action: z.string().optional(),
  processed: z.boolean(),
  success: z.boolean(),
  error: z.string().optional(),
});

export type WebhookOutput = z.infer<typeof WebhookOutputSchema>;

export const AgentArtifactSchema = z.object({
  id: z.string(),
  type: z.string(),
  content: z.unknown(),
  createdAt: z.number(),
});

export type AgentArtifact = z.infer<typeof AgentArtifactSchema>;

export const AgentCheckpointSchema = z.object({
  step: z.number(),
  state: z.record(z.string(), z.unknown()),
  timestamp: z.number(),
});

export type AgentCheckpoint = z.infer<typeof AgentCheckpointSchema>;

export const BackgroundAgentInputSchema = z.object({
  sessionId: z.string(),
  agentType: z.string(),
  initialPrompt: z.string(),
  context: z.record(z.string(), z.unknown()),
  maxSteps: z.number(),
});

export type BackgroundAgentInput = z.infer<typeof BackgroundAgentInputSchema>;

export const BackgroundAgentOutputSchema = z.object({
  sessionId: z.string(),
  steps: z.number(),
  artifacts: z.array(AgentArtifactSchema),
  status: z.enum(["completed", "cancelled", "error"]),
});

export type BackgroundAgentOutput = z.infer<typeof BackgroundAgentOutputSchema>;

export const CleanupInputSchema = z.object({
  type: z.enum(["DAILY", "DELETION_SYNC"]),
  teamId: z.string().optional(),
  connectorId: z.string().optional(),
});

export type CleanupInput = z.infer<typeof CleanupInputSchema>;

export const CleanupOutputSchema = z.object({
  staleDeleted: z.number(),
  orphansRemoved: z.number(),
  errors: z.array(z.string()),
});

export type CleanupOutput = z.infer<typeof CleanupOutputSchema>;

export const ConnectorCleanupInputSchema = z.object({
  connectorId: z.string(),
  teamId: z.string(),
  scheduledAt: z.number(),
});

export type ConnectorCleanupInput = z.infer<typeof ConnectorCleanupInputSchema>;

export const ConnectorCleanupOutputSchema = z.object({
  connectorId: z.string(),
  status: z.enum(["completed", "cancelled"]),
});

export type ConnectorCleanupOutput = z.infer<
  typeof ConnectorCleanupOutputSchema
>;

export const IndexDocumentsInputSchema = z.object({
  documents: z.array(z.unknown()),
  connectorId: z.string(),
  batchSize: z.number().optional(),
  syncHistoryId: z.string().optional(),
});

export type IndexDocumentsInput = z.infer<typeof IndexDocumentsInputSchema>;

export const IndexDocumentsOutputSchema = z.object({
  indexed: z.number(),
  errors: z.number(),
  total: z.number(),
  success: z.boolean(),
  skipped: z.number().default(0),
  dataAdded: z.number().default(0),
  dataUpdated: z.number().default(0),
});

export type IndexDocumentsOutput = z.infer<typeof IndexDocumentsOutputSchema>;

export const DigestDeliveryInputSchema = z.object({
  subscriptionId: z.string(),
  connectorId: z.string(),
  userId: z.string(),
  slackUserId: z.string(),
  teamId: z.string(),
  channelIds: z.array(z.string()),
  topics: z.array(z.string()),
  deliveryTime: z.string(),
  timezone: z.string(),
  frequency: z.enum(["daily", "weekly"]),
});

export type DigestDeliveryInput = z.infer<typeof DigestDeliveryInputSchema>;

export const DigestDeliveryOutputSchema = z.object({
  subscriptionId: z.string(),
  delivered: z.boolean(),
  messageTs: z.string().optional(),
  error: z.string().optional(),
});

export type DigestDeliveryOutput = z.infer<typeof DigestDeliveryOutputSchema>;

export const CanvasExecutionCheckpointSchema = z.object({
  currentNodeId: z.string().nullable(),
  currentPayload: z.unknown().optional(),
  lastStepOutput: z.unknown().optional(),
  traceSnapshot: z.object({
    id: z.string(),
    status: z.string(),
    stepsCount: z.number(),
    totalLatencyMs: z.number(),
  }),
  approvalResponses: z.array(z.tuple([z.string(), z.unknown()])),
  inputResponses: z.array(z.tuple([z.string(), z.unknown()])),
  loopStates: z.array(z.tuple([z.string(), z.unknown()])),
  loopStack: z.array(z.string()),
  continueAsNewCount: z.number(),
});

export const AgentCanvasExecutionInputSchema = z.object({
  executionId: z.string(),
  agentCanvasId: z.string(),
  versionNumber: z.number(),
  teamId: z.string(),
  triggeredById: z.string(),
  triggerSource: z.string().optional(),
  input: z.unknown().optional(),
  canvas: CanvasStateSchema,
  checkpoint: CanvasExecutionCheckpointSchema.optional(),
  policy: z.unknown().optional(),
  sessionId: z.string().optional(),
  turnId: z.string().optional(),
});

export type AgentCanvasExecutionInput = z.infer<
  typeof AgentCanvasExecutionInputSchema
>;

export const AgentCanvasExecutionOutputSchema = z.object({
  executionId: z.string(),
  status: ExecutionStatusSchema,
  output: z.unknown().optional(),
});

export type AgentCanvasExecutionOutput = z.infer<
  typeof AgentCanvasExecutionOutputSchema
>;

export const ReembedInputSchema = z.object({
  connectorId: z.string(),
  batchSize: z.number().optional(),
  fromVersion: z.number().optional(),
});

export type ReembedInput = z.infer<typeof ReembedInputSchema>;

export const ReembedOutputSchema = z.object({
  processed: z.number(),
  updated: z.number(),
  errors: z.number(),
});

export type ReembedOutput = z.infer<typeof ReembedOutputSchema>;

export const EntityExtractionInputSchema = z.object({
  connectorId: z.string(),
  documentIds: z.array(z.string()).optional(),
  batchSize: z.number().optional(),
});

export type EntityExtractionInput = z.infer<typeof EntityExtractionInputSchema>;

export const EntityExtractionOutputSchema = z.object({
  documentsProcessed: z.number(),
  entitiesExtracted: z.number(),
  errors: z.number(),
});

export type EntityExtractionOutput = z.infer<
  typeof EntityExtractionOutputSchema
>;

export const SearchPayloadSchema = z.object({
  query: z.string(),
  queryEmbedding: z.array(z.number()),
});

export const ClickPayloadSchema = z.object({
  docId: z.string(),
  connectorType: z.string(),
  docEmbedding: z.array(z.number()),
  authorId: z.string().nullable(),
  topicIds: z.array(z.string()),
  dwellMs: z.number(),
  position: z.number(),
});

export const FeedbackPayloadSchema = z.object({
  docId: z.string(),
  feedbackType: z.enum(["helpful", "not_helpful"]),
});

export const ProfileUpdateInputSchema = z.object({
  userId: z.string(),
  teamId: z.string(),
  eventType: z.enum(["search", "click", "feedback"]),
  payload: z.union([
    SearchPayloadSchema,
    ClickPayloadSchema,
    FeedbackPayloadSchema,
  ]),
});

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateInputSchema>;

export const ProfileUpdateOutputSchema = z.object({
  success: z.boolean(),
  eventType: z.enum(["search", "click", "feedback"]),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ProfileUpdateOutput = z.infer<typeof ProfileUpdateOutputSchema>;

export const LtrTrainingInputSchema = z.object({
  teamId: z.string(),
  modelVersion: z.string().optional(),
  minSamples: z.number().optional(),
});

export type LtrTrainingInput = z.infer<typeof LtrTrainingInputSchema>;

export const LtrTrainingOutputSchema = z.object({
  modelId: z.string(),
  samplesUsed: z.number(),
  accuracy: z.number(),
  deployedAt: z.number().optional(),
});

export type LtrTrainingOutput = z.infer<typeof LtrTrainingOutputSchema>;

export const AnalyticsExportInputSchema = z.object({
  teamId: z.string(),
  exportType: z.enum(["daily", "weekly", "monthly"]),
  startDate: z.number(),
  endDate: z.number(),
  remainingTeamIds: z.array(z.string()).optional(),
  accumulatedRecords: z.number().optional(),
  processedCount: z.number().optional(),
  errorCount: z.number().optional(),
});

export type AnalyticsExportInput = z.infer<typeof AnalyticsExportInputSchema>;

export const AnalyticsExportOutputSchema = z.object({
  exportId: z.string(),
  recordCount: z.number(),
  storagePath: z.string(),
});

export type AnalyticsExportOutput = z.infer<typeof AnalyticsExportOutputSchema>;

export const EmergenceDetectionInputSchema = z.object({
  teamId: z.string().optional(),
  analysisType: z.enum(["weekly", "aggregation", "validation"]).optional(),
  dateRange: z
    .object({
      start: z.number(),
      end: z.number(),
    })
    .optional(),
  minFrequency: z.number().optional(),
  minSuccessRate: z.number().optional(),
});

export type EmergenceDetectionInput = z.infer<
  typeof EmergenceDetectionInputSchema
>;

export const EmergenceDetectionOutputSchema = z.object({
  patternsAnalyzed: z.number(),
  newPatterns: z.number(),
  validatedPatterns: z.number(),
  formalizationCandidates: z.array(z.string()),
});

export type EmergenceDetectionOutput = z.infer<
  typeof EmergenceDetectionOutputSchema
>;

export const SyncStageSchema = z.string();

export type SyncStage = z.infer<typeof SyncStageSchema>;

export const SyncStateSchema = z.object({
  processed: z.number(),
  indexed: z.number(),
  errors: z.number(),
  dataAdded: z.number().default(0),
  dataUpdated: z.number().default(0),
  dataDeleted: z.number().default(0),
  cursor: SyncCursorSchema.optional(),
  stage: SyncStageSchema,
  progressMessage: z.string().optional(),
  batchNumber: z.number().optional(),
  cancelled: z.boolean().optional(),
  isPaused: z.boolean().optional(),
});

export type SyncState = z.infer<typeof SyncStateSchema>;

export const WorkflowAgentStatusSchema = z.enum([
  "running",
  "completed",
  "cancelled",
  "error",
]);

export type WorkflowAgentStatus = z.infer<typeof WorkflowAgentStatusSchema>;

export const WorkflowAgentStateSchema = z.object({
  steps: z.number(),
  artifacts: z.array(AgentArtifactSchema),
  status: WorkflowAgentStatusSchema,
  lastCheckpoint: AgentCheckpointSchema.nullable(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type WorkflowAgentState = z.infer<typeof WorkflowAgentStateSchema>;

export type CanvasExecutionCheckpoint = z.infer<
  typeof CanvasExecutionCheckpointSchema
>;
