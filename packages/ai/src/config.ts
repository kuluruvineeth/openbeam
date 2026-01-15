import type { ProviderId } from "@openplane/types/ai";
import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_EMBEDDING_MODEL,
} from "@openplane/types/ai";

export type {
  AgentRuntimeConfig,
  AIConfig,
  CompletionConfig,
  EmbeddingConfig,
  EngineConfig,
  ProviderConfig,
  ProviderId,
} from "@openplane/types/ai";

type AIConfig = import("@openplane/types/ai").AIConfig;

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: configuration loading requires multiple provider checks
function loadConfig(): AIConfig {
  return {
    defaultProvider:
      (process.env.AI_DEFAULT_PROVIDER as ProviderId) || "openai",
    defaultChatModel: process.env.AI_DEFAULT_CHAT_MODEL || DEFAULT_CHAT_MODEL,
    defaultEmbeddingModel:
      process.env.AI_DEFAULT_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL,

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

    engine: {
      baseURL: process.env.ENGINE_URL || "http://localhost:8000",
      gpuURL: process.env.ENGINE_GPU_URL || "http://localhost:8001",
      timeout: Number(process.env.ENGINE_TIMEOUT) || 30_000,
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
