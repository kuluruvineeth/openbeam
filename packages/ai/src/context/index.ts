export type {
  CacheHint,
  CacheOptimizationResult,
  CacheOptimizerOptions,
} from "./cache-hints";
export {
  CacheOptimizer,
  createCacheOptimizer,
  formatWithCacheHints,
} from "./cache-hints";
export type {
  CompactionConfig,
  CompactionResult,
  ContextEvent,
} from "./compaction";
export {
  compactContext,
  observationsToEvents,
  shouldCompact,
} from "./compaction";
export {
  createTokenEstimator,
  estimateMessageTokens,
  estimateTokenCount,
} from "./estimator";
export { ContextManager, createContextManager } from "./manager";
export type {
  BuiltContext,
  CacheControl,
  MessageBuilderOptions,
  TextPartWithCache,
} from "./message-builder";
export {
  appendAssistantMessage,
  appendUserMessage,
  buildContextMessages,
} from "./message-builder";
export type {
  Objective,
  ObjectiveStatus,
  ObjectiveTrackerOptions,
} from "./objectives";
export { createObjectiveTracker, ObjectiveTracker } from "./objectives";
export type {
  ContextOrchestratorOptions,
  OrchestratorState,
} from "./orchestrator";
export { ContextOrchestrator, createContextOrchestrator } from "./orchestrator";
export type {
  ContextManagerOptions,
  ContextSnapshot,
  ContextWindow,
  MaskedObservation,
  ObservationMask,
  TokenEstimator,
} from "./types";
export type {
  VirtualFile,
  VirtualFileReference,
  VirtualFileStoreOptions,
} from "./virtual-files";
export {
  createVirtualFileStore,
  shouldStoreAsVirtualFile,
  VirtualFileStore,
} from "./virtual-files";
