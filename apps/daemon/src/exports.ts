// CLI exports for @openplane/server

// Agent activity curator for CLI logs
export { curateAgentActivity } from "./agent/activity-curator.js";
export {
  type AgentCaller,
  DEFAULT_STRUCTURED_GENERATION_PROVIDERS,
  generateStructuredAgentResponseWithFallback,
  getStructuredAgentResponse,
  type JsonSchema,
  StructuredAgentFallbackError,
  type StructuredAgentGenerationOptions,
  type StructuredAgentGenerationWithFallbackOptions,
  StructuredAgentResponseError,
  type StructuredAgentResponseOptions,
  type StructuredGenerationAttempt,
  type StructuredGenerationProvider,
} from "./agent/agent-response-loop.js";
// Agent SDK types for CLI commands
export type {
  AgentCapabilityFlags,
  AgentMode,
  AgentPermissionRequest,
  AgentTimelineItem,
  AgentUsage,
} from "./agent/agent-sdk-types.js";
export {
  createOpenPlaneDaemon,
  type OpenPlaneDaemon,
  type OpenPlaneDaemonConfig,
} from "./bootstrap.js";
export {
  type ConnectionState,
  DaemonClient,
  type DaemonClientConfig,
  type DaemonEvent,
} from "./client/daemon-client.js";
export { type CliConfigOverrides, loadConfig } from "./config.js";
export { createRootLogger, type LogFormat, type LogLevel } from "./logger.js";
export { resolveOpenPlaneHome } from "./openplane-home.js";
export {
  generateLocalPairingOffer,
  type LocalPairingOffer,
} from "./pairing-offer.js";
export {
  loadPersistedConfig,
  type PersistedConfig,
} from "./persisted-config.js";
// WebSocket message types for CLI streaming
export type {
  AgentSnapshotPayload,
  AgentStreamEventPayload,
  AgentStreamMessage,
} from "./shared/messages.js";
export {
  ensureLocalSpeechModels,
  type LocalSpeechModelId,
  type LocalSttModelId,
  type LocalTtsModelId,
  listLocalSpeechModels,
} from "./speech/providers/local/models.js";
export {
  applySherpaLoaderEnv,
  resolveSherpaLoaderEnv,
  type SherpaLoaderEnvKey,
  type SherpaLoaderEnvResolution,
  sherpaLoaderEnvKey,
  sherpaPlatformArch,
  sherpaPlatformPackageName,
} from "./speech/providers/local/sherpa/sherpa-runtime-env.js";
