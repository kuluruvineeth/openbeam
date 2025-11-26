/**
 * @openplane/ai
 *
 * Production-ready AI package for OpenPlane - model-agnostic LLM, embeddings, RAG, and agentic workflows.
 *
 * Built on Vercel AI SDK for:
 * - Model-agnostic provider switching (OpenAI, Anthropic, Google, Azure, Ollama)
 * - Native streaming support with backpressure handling
 * - Tool calling with automatic execution loops
 * - MCP (Model Context Protocol) integration
 * - Edge/serverless compatibility
 *
 * Architecture:
 * - @openplane/db for persistent storage
 * - @openplane/redis for caching and queues
 * - @openplane/vespa for vector search and retrieval
 */

// ============================================================================
// Configuration
// ============================================================================

export type {
  AgentConfig as AIAgentConfig,
  AIConfig,
  AnthropicConfig,
  AzureConfig,
  CacheConfig,
  GoogleConfig,
  OllamaConfig,
  OpenAIConfig,
  ProviderType,
  RAGConfig,
  RateLimitConfig as AIRateLimitConfig,
  TelemetryConfig,
} from "./config";
export {
  getConfig,
  getDefaultConfig,
  resetConfig,
  updateConfig,
} from "./config";

// ============================================================================
// Providers
// ============================================================================

export type {
  ChatModelConfig,
  EmbeddingModelConfig,
  ModelCapabilities,
  ModelInfo,
  ProviderFactory,
  ProviderId,
  ProviderRegistry,
} from "./providers";
export {
  anthropicProvider,
  azureProvider,
  getChatModel,
  getDefaultChatModel,
  getDefaultEmbeddingModel,
  getEmbeddingModel,
  googleProvider,
  MODELS,
  ollamaProvider,
  openaiProvider,
  registry,
} from "./providers";

// ============================================================================
// Embeddings
// ============================================================================

export type {
  BatchEmbeddingResult,
  ChunkingConfig,
  ChunkingStrategy,
  DocumentToEmbed,
  EmbeddedChunk,
  EmbeddedDocument,
  Embedding,
  EmbeddingConfig,
  EmbeddingOptions,
  EmbeddingResult,
  SimilarityResult,
  TextChunk,
} from "./embeddings";
export {
  chunkDocument,
  DEFAULT_CHUNKING_CONFIG,
  DocumentChunker,
  EmbeddingService,
  embedDocument,
  embeddingService,
  embedQuery,
  embedText,
} from "./embeddings";

// ============================================================================
// Completion
// ============================================================================

export type {
  ChatMessage,
  Citation,
  CompletionConfig,
  CompletionContext,
  CompletionOptions,
  CompletionResult,
  ContextDocument,
  Conversation,
  DataStreamPart,
  MessageRole,
  PersistedUIMessage,
  RAGCompletionResult,
  StreamChunk,
  StreamingCompletionResult,
  ToolCall,
  ToolCallResult,
  UIAnnotation,
  UIAttachment,
  UIMessage,
  UIToolInvocation,
} from "./completion";
export {
  CompletionService,
  collectStreamText,
  complete,
  completeWithContext,
  completionService,
  createAssistantMessage,
  createDataPart,
  createDataStream,
  createFinishPart,
  createSSEStream,
  createSystemMessage,
  createTextPart,
  createTextStream,
  createToolCallPart,
  createToolResultPart,
  createUserMessage,
  encodeDataStreamPart,
  fromUIMessage,
  fromUIMessages,
  generateMessageId,
  parseDataStreamLine,
  parseSSEStream,
  streamCompletion,
  toUIMessage,
  toUIMessages,
} from "./completion";

// ============================================================================
// RAG Pipeline
// ============================================================================

export type {
  BuiltContext,
  ContextWindowConfig,
  QueryAnalysis,
  RAGAnswer,
  RAGOptions,
  RAGPipelineConfig,
  RAGStreamChunk,
  RerankedDocument,
  RerankOptions,
  RetrievalOptions,
  RetrievalResult,
  RetrievedDocument,
} from "./rag";
export {
  buildContext,
  ContextBuilder,
  contextBuilder,
  RAGPipeline,
  Reranker,
  Retriever,
  ragAnswer,
  ragPipeline,
  ragStream,
  rerankDocuments,
  reranker,
  retrieve,
  retriever,
} from "./rag";

// ============================================================================
// Tools
// ============================================================================

export type {
  IMCPServer,
  IToolRegistry,
  MCPPropertySchema,
  MCPTool,
  ToolCall as AIToolCall,
  ToolCallResult as AIToolCallResult,
  ToolCategory,
  ToolContext,
  ToolDefinition,
  ToolParameterSchema,
  ToolResult,
} from "./tools";
export {
  allToolsToMCP,
  analyzeTextTool,
  calculatorTool,
  createMCPServer,
  currentDateTimeTool,
  defineTool,
  findSimilarTool,
  getDocumentTool,
  importMCPServer,
  importMCPTool,
  initializeBuiltinTools,
  mcpToolsToAISDK,
  parseUrlTool,
  registerTool,
  searchTool,
  ToolRegistry,
  toolRegistry,
  toolToMCP,
  unitConverterTool,
  validateJsonTool,
} from "./tools";

// ============================================================================
// Agents
// ============================================================================

export type {
  AgentConfig,
  AgentContext,
  AgentExecutionResult,
  AgentPlan,
  AgentResult,
  AgentStep,
  AgentStepResult,
  AgentStepType,
  AgentTaskType,
  AgentV6Config,
  IAgentMemory,
  MemoryEntry,
  StepFinishEvent,
  StepHandler,
  StepHandlers,
} from "./agents";
export {
  AgentMemory,
  AgentPlanner,
  agentPlanner,
  agentStepHandlers,
  createAgent,
  createMemory,
  createTaskAgent,
  executeAgent,
  executeStep,
  executeSteps,
  generatePlan,
  getOrCreateMemory,
  streamAgent,
} from "./agents";

// ============================================================================
// Prompts
// ============================================================================

export type { TemplateCategory } from "./prompts";
export {
  agentPlannerTemplates,
  escapeForPrompt,
  extractVariables,
  formatDocument,
  formatKeyValues,
  formatList,
  getTemplate,
  injectVariables,
  PromptBuilder,
  prompt,
  prompts,
  renderTemplate,
  searchQaTemplates,
  summarizeTemplates,
  templates,
  truncateText,
  validateVariables,
} from "./prompts";

// ============================================================================
// Utilities
// ============================================================================

export type {
  ModelPricing,
  RateLimitConfig,
  UsageEntry,
  UsageSummary,
} from "./utils";
export {
  CostTracker,
  costTracker,
  createAnthropicRateLimiter,
  createOpenAIRateLimiter,
  estimateMessagesTokens,
  estimateTokens,
  fitsWithinLimit,
  getAvailableResponseTokens,
  getModelLimits,
  getModelPricing,
  getRateLimiter,
  MODEL_LIMITS,
  MODEL_PRICING,
  RateLimiter,
  setRateLimiter,
  trackUsage,
  truncateToTokens,
} from "./utils";
