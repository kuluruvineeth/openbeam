export type ProviderId = "openai" | "anthropic" | "google" | "azure" | "ollama";

export interface ProviderConfig {
  openai: {
    apiKey?: string;
    organization?: string;
    baseURL?: string;
  };
  anthropic: {
    apiKey?: string;
    baseURL?: string;
  };
  google: {
    apiKey?: string;
  };
  azure: {
    apiKey?: string;
    resourceName?: string;
    deploymentName?: string;
    apiVersion?: string;
  };
  ollama: {
    baseURL: string;
  };
}

export interface EmbeddingConfig {
  /** Default embedding dimensions (1536 for text-embedding-3-small) */
  dimensions: number;
  /** Maximum tokens per embedding request */
  maxTokens: number;
  /** Batch size for embedding multiple texts */
  batchSize: number;
}

export interface CompletionConfig {
  /** Default temperature for completions */
  temperature: number;
  /** Default max tokens for completions */
  maxTokens: number;
  /** Top P sampling parameter */
  topP: number;
}

export interface AgentConfig {
  /** Maximum steps for agentic loops */
  maxSteps: number;
  /** Maximum tokens per step */
  maxTokensPerStep: number;
  /** Timeout for agent execution (ms) */
  timeoutMs: number;
  /** Maximum tool roundtrips */
  maxToolRoundtrips: number;
  /** Enable parallel tool execution */
  enableParallelTools: boolean;
}

export interface AIConfig {
  /** Default provider for chat completions */
  defaultProvider: ProviderId;
  /** Default chat model */
  defaultChatModel: string;
  /** Default embedding model */
  defaultEmbeddingModel: string;
  /** Provider-specific configurations */
  providers: ProviderConfig;
  /** Embedding service config */
  embedding: EmbeddingConfig;
  /** Completion service config */
  completion: CompletionConfig;
  /** Agent config */
  agent: AgentConfig;
}

function loadConfig(): AIConfig {
  return {
    defaultProvider:
      (process.env.AI_DEFAULT_PROVIDER as ProviderId) || "openai",
    defaultChatModel: process.env.AI_DEFAULT_CHAT_MODEL || "gpt-5.1",
    defaultEmbeddingModel:
      process.env.AI_DEFAULT_EMBEDDING_MODEL || "text-embedding-3-small",

    providers: {
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
      azure: {
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        resourceName: process.env.AZURE_OPENAI_RESOURCE_NAME,
        deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        apiVersion:
          process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview",
      },
      ollama: {
        baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
      },
    },

    embedding: {
      dimensions: Number(process.env.AI_EMBEDDING_DIMENSIONS) || 1536,
      maxTokens: Number(process.env.AI_EMBEDDING_MAX_TOKENS) || 8191,
      batchSize: Number(process.env.AI_EMBEDDING_BATCH_SIZE) || 100,
    },

    completion: {
      temperature: Number(process.env.AI_COMPLETION_TEMPERATURE) || 0.7,
      maxTokens: Number(process.env.AI_COMPLETION_MAX_TOKENS) || 4096,
      topP: Number(process.env.AI_COMPLETION_TOP_P) || 1,
    },

    agent: {
      maxSteps: Number(process.env.AI_AGENT_MAX_STEPS) || 15,
      maxTokensPerStep:
        Number(process.env.AI_AGENT_MAX_TOKENS_PER_STEP) || 4096,
      timeoutMs: Number(process.env.AI_AGENT_TIMEOUT_MS) || 300_000,
      maxToolRoundtrips: Number(process.env.AI_AGENT_MAX_TOOL_ROUNDTRIPS) || 10,
      enableParallelTools:
        process.env.AI_AGENT_ENABLE_PARALLEL_TOOLS !== "false",
    },
  };
}

let configInstance: AIConfig | null = null;

export function getConfig(): AIConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

export function updateConfig(updates: Partial<AIConfig>): AIConfig {
  configInstance = { ...getConfig(), ...updates };
  return configInstance;
}

export function resetConfig(): void {
  configInstance = null;
}
