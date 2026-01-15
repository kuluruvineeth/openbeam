/**
 * Streaming Module
 *
 * Unified agent-to-UI communication infrastructure.
 *
 * ## Architecture
 *
 * ```
 * Agent Patterns (LlmAgent, etc.)
 *       │
 *       ▼ yields AgentStreamChunk
 *
 * ┌─────────────────────────────────────────────┐
 * │           STREAMING MODULE                  │
 * ├─────────────────────────────────────────────┤
 * │                                             │
 * │  adapters/agent-stream.ts                   │
 * │  ├─ adaptAgentStream()                      │
 * │  └─ AgentStreamChunk → AgentEvent           │
 * │                                             │
 * │  utilities/                                 │
 * │  ├─ timeout.ts (withTimeout, withAbort)     │
 * │  ├─ state.ts (StreamState, metrics)         │
 * │  └─ consumer.ts (createStreamConsumer)      │
 * │                                             │
 * │  events.ts (AgentEvent types)               │
 * │  transformer.ts (RawAgentEvent → AgentEvent)│
 * │  tool-metadata.ts (display metadata)        │
 * │                                             │
 * └─────────────────────────────────────────────┘
 *       │
 *       ▼ yields AgentEvent
 *
 * UI / tRPC / MCP consumers
 * ```
 *
 * ## Quick Start
 *
 * ```typescript
 * import { createStreamConsumer } from "@openplane/ai/streaming";
 *
 * const consumer = createStreamConsumer(agent.stream(input, ctx), {
 *   timeoutMs: 60_000,
 *   visibilityFilter: ["visible", "ephemeral"],
 * });
 *
 * for await (const event of consumer.events()) {
 *   switch (event.type) {
 *     case "text": updateUI(event.content); break;
 *     case "tool_call": showProgress(event.displayName); break;
 *     case "done": finalize(); break;
 *   }
 * }
 * ```
 */

export {
  type AgentStreamAdapterOptions,
  adaptAgentStream,
  adaptSingleChunk,
} from "./adapters";
export type {
  AgentEvent,
  AgentEventBase,
  AgentEventType,
  AgentStatus,
  DoneEvent,
  ErrorEvent,
  StatusEvent,
  TextEvent,
  ThinkingEvent,
  ToolCallEvent,
  ToolResultEvent,
  ToolVisibility,
} from "./events";
export {
  AgentEventTypeSchema,
  AgentStatusSchema,
  createEvent,
  done,
  error,
  status,
  ToolVisibilitySchema,
  text,
  thinking,
  toolCall,
  toolResult,
} from "./events";
export {
  registerAllBuiltinTools,
  registerDocumentTools,
  registerOverviewTools,
  registerRagTools,
  registerSearchTools,
} from "./registrations";
export type { ToolMetadata, ToolMetadataInput } from "./tool-metadata";
export {
  clearRegistry,
  getDisplayName,
  getRegisteredToolCount,
  getStatusForTool,
  getToolMetadata,
  isEphemeral,
  isHidden,
  registerToolMetadata,
} from "./tool-metadata";
export type {
  EventTransformer,
  RawAgentEvent,
  TransformerOptions,
} from "./transformer";
export { createEventTransformer, transformStream } from "./transformer";
export {
  collectWithTimeout,
  consumeToCompletion,
  createStreamConsumer,
  createStreamState,
  getStreamMetrics,
  pipeWithTransform,
  type StreamConsumer,
  type StreamConsumerOptions,
  type StreamMetrics,
  type StreamState,
  StreamStateAccumulator,
  StreamTimeoutError,
  type StreamTiming,
  type TimeoutOptions,
  type ToolCallState,
  updateStateFromEvent,
  withAbort,
  withIdleTimeout,
  withStateTracking,
  withTimeout,
} from "./utilities";
