// CLI exports for @openbeam/server

// Agent activity curator for CLI logs
export { curateAgentActivity } from "./agent/activity-curator";
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
} from "./agent/agent-response-loop";
// Agent SDK types for CLI commands
export type {
  AgentCapabilityFlags,
  AgentMode,
  AgentPermissionRequest,
  AgentTimelineItem,
  AgentUsage,
} from "./agent/agent-sdk-types";
export {
  createOpenBeamDaemon,
  type OpenBeamDaemon,
  type OpenBeamDaemonConfig,
} from "./bootstrap";
export {
  type ConnectionState,
  DaemonClient,
  type DaemonClientConfig,
  type DaemonEvent,
} from "./client/daemon-client";
export { type CliConfigOverrides, loadConfig } from "./config";
export { createRootLogger, type LogFormat, type LogLevel } from "./logger";
export { resolveOpenBeamHome } from "./openplane-home";
export {
  generateLocalPairingOffer,
  type LocalPairingOffer,
} from "./pairing-offer";
export {
  loadPersistedConfig,
  type PersistedConfig,
} from "./persisted-config";
// WebSocket message types for CLI streaming
export type {
  AgentSnapshotPayload,
  AgentStreamEventPayload,
  AgentStreamMessage,
} from "./shared/messages";
export {
  ensureLocalSpeechModels,
  type LocalSpeechModelId,
  type LocalSttModelId,
  type LocalTtsModelId,
  listLocalSpeechModels,
} from "./speech/providers/local/models";
export {
  applySherpaLoaderEnv,
  resolveSherpaLoaderEnv,
  type SherpaLoaderEnvKey,
  type SherpaLoaderEnvResolution,
  sherpaLoaderEnvKey,
  sherpaPlatformArch,
  sherpaPlatformPackageName,
} from "./speech/providers/local/sherpa/sherpa-runtime-env";
