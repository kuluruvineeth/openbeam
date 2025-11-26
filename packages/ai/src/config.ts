/**
 * AI Package Configuration
 *
 * Centralized configuration for all AI services.
 * Supports environment-based configuration with sensible defaults.
 *
 * This configuration integrates with:
 * - @openplane/db for persistence
 * - @openplane/redis for caching
 * - @openplane/vespa for retrieval
 */

export interface AIConfig {
  // Default provider settings
  defaultProvider: ProviderType;
  defaultChatModel: string;
  defaultEmbeddingModel: string;

  // Provider-specific settings
  openai: OpenAIConfig;
  anthropic: AnthropicConfig;
  google: GoogleConfig;
  ollama: OllamaConfig;
  azure: AzureConfig;

  // RAG settings
  rag: RAGConfig;

  // Agent settings
  agent: AgentConfig;

  // Rate limiting
  rateLimit: RateLimitConfig;

  // Caching settings
  cache: CacheConfig;

  // Telemetry settings
  telemetry: TelemetryConfig;
}

export type ProviderType =
  | "openai"
  | "anthropic"
  | "google"
  | "ollama"
  | "azure";

export interface OpenAIConfig {
  apiKey?: string;
  organization?: string;
  baseURL?: string;
}

export interface AnthropicConfig {
  apiKey?: string;
  baseURL?: string;
}

export interface GoogleConfig {
  apiKey?: string;
}

export interface OllamaConfig {
  baseURL: string;
}

export interface AzureConfig {
  apiKey?: string;
  resourceName?: string;
  deploymentName?: string;
  apiVersion?: string;
}

export interface RAGConfig {
  // Context window settings
  maxContextTokens: number;
  reservedOutputTokens: number;

  // Retrieval settings
  defaultTopK: number;
  minRelevanceScore: number;

  // Reranking
  enableReranking: boolean;
  rerankTopK: number;

  // Caching
  enableContextCaching: boolean;
  contextCacheTTL: number; // seconds
}

export interface AgentConfig {
  // Execution limits
  maxSteps: number;
  maxTokensPerStep: number;
  timeoutMs: number;

  // Tool settings
  maxToolRoundtrips: number;
  enableParallelTools: boolean;

  // Agentic loop settings
  maxRetries: number;
  retryDelayMs: number;

  // Memory settings
  memoryWindowSize: number;
  enableSemanticMemory: boolean;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
}

export interface CacheConfig {
  // Redis-backed caching
  enableEmbeddingCache: boolean;
  embeddingCacheTTL: number; // seconds
  enableCompletionCache: boolean;
  completionCacheTTL: number; // seconds
  enableContextCache: boolean;
  contextCacheTTL: number; // seconds
}

export interface TelemetryConfig {
  enabled: boolean;
  serviceName: string;
  // Spans and traces for observability
  traceCompletions: boolean;
  traceAgentSteps: boolean;
  traceToolCalls: boolean;
}

/**
 * Default configuration with environment variable overrides
 */
export function getDefaultConfig(): AIConfig {
  return {
    defaultProvider:
      (process.env.AI_DEFAULT_PROVIDER as ProviderType) || "openai",
    defaultChatModel: process.env.AI_DEFAULT_CHAT_MODEL || "gpt-4o",
    defaultEmbeddingModel:
      process.env.AI_DEFAULT_EMBEDDING_MODEL || "text-embedding-3-small",

    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORGANIZATION,
      baseURL: process.env.OPENAI_BASE_URL,
    },

    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: process.env.ANTHROPIC_BASE_URL,
    },

    google: {
      apiKey: process.env.GOOGLE_AI_API_KEY,
    },

    ollama: {
      baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
    },

    azure: {
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME,
      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview",
    },

    rag: {
      maxContextTokens: Number(process.env.RAG_MAX_CONTEXT_TOKENS) || 16_000,
      reservedOutputTokens:
        Number(process.env.RAG_RESERVED_OUTPUT_TOKENS) || 4000,
      defaultTopK: Number(process.env.RAG_DEFAULT_TOP_K) || 10,
      minRelevanceScore: Number(process.env.RAG_MIN_RELEVANCE_SCORE) || 0.3,
      enableReranking: process.env.RAG_ENABLE_RERANKING !== "false",
      rerankTopK: Number(process.env.RAG_RERANK_TOP_K) || 5,
      enableContextCaching: process.env.RAG_ENABLE_CONTEXT_CACHING !== "false",
      contextCacheTTL: Number(process.env.RAG_CONTEXT_CACHE_TTL) || 3600,
    },

    agent: {
      maxSteps: Number(process.env.AGENT_MAX_STEPS) || 15,
      maxTokensPerStep: Number(process.env.AGENT_MAX_TOKENS_PER_STEP) || 4000,
      timeoutMs: Number(process.env.AGENT_TIMEOUT_MS) || 300_000, // 5 minutes
      maxToolRoundtrips: Number(process.env.AGENT_MAX_TOOL_ROUNDTRIPS) || 10,
      enableParallelTools: process.env.AGENT_ENABLE_PARALLEL_TOOLS !== "false",
      maxRetries: Number(process.env.AGENT_MAX_RETRIES) || 3,
      retryDelayMs: Number(process.env.AGENT_RETRY_DELAY_MS) || 1000,
      memoryWindowSize: Number(process.env.AGENT_MEMORY_WINDOW_SIZE) || 20,
      enableSemanticMemory:
        process.env.AGENT_ENABLE_SEMANTIC_MEMORY !== "false",
    },

    rateLimit: {
      requestsPerMinute: Number(process.env.AI_RATE_LIMIT_RPM) || 100,
      tokensPerMinute: Number(process.env.AI_RATE_LIMIT_TPM) || 150_000,
    },

    cache: {
      enableEmbeddingCache: process.env.AI_ENABLE_EMBEDDING_CACHE !== "false",
      embeddingCacheTTL: Number(process.env.AI_EMBEDDING_CACHE_TTL) || 604_800, // 7 days
      enableCompletionCache: process.env.AI_ENABLE_COMPLETION_CACHE === "true",
      completionCacheTTL: Number(process.env.AI_COMPLETION_CACHE_TTL) || 3600, // 1 hour
      enableContextCache: process.env.AI_ENABLE_CONTEXT_CACHE !== "false",
      contextCacheTTL: Number(process.env.AI_CONTEXT_CACHE_TTL) || 3600, // 1 hour
    },

    telemetry: {
      enabled: process.env.AI_TELEMETRY_ENABLED !== "false",
      serviceName: process.env.AI_TELEMETRY_SERVICE_NAME || "openplane-ai",
      traceCompletions: process.env.AI_TRACE_COMPLETIONS !== "false",
      traceAgentSteps: process.env.AI_TRACE_AGENT_STEPS !== "false",
      traceToolCalls: process.env.AI_TRACE_TOOL_CALLS !== "false",
    },
  };
}

// Singleton config instance
let configInstance: AIConfig | null = null;

/**
 * Get the current AI configuration
 */
export function getConfig(): AIConfig {
  if (!configInstance) {
    configInstance = getDefaultConfig();
  }
  return configInstance;
}

/**
 * Update configuration (useful for testing or runtime changes)
 */
export function updateConfig(updates: Partial<AIConfig>): void {
  configInstance = { ...getConfig(), ...updates };
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  configInstance = null;
}
