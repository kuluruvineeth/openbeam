import { z } from "zod";

export const ProviderIdSchema = z.enum([
  "openai",
  "anthropic",
  "google",
  "azure",
  "ollama",
  "twelvelabs",
]);

export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const ChatModelDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: ProviderIdSchema,
  contextWindow: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
  supportsTools: z.boolean(),
  supportsVision: z.boolean(),
  supportsStreaming: z.boolean(),
  costPer1kInput: z.number().optional(),
  costPer1kOutput: z.number().optional(),
});

export type ChatModelDefinition = z.infer<typeof ChatModelDefinitionSchema>;

export const EmbeddingModelDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: ProviderIdSchema,
  dimensions: z.number().int().positive(),
  maxTokens: z.number().int().positive(),
  costPer1kTokens: z.number().optional(),
});

export type EmbeddingModelDefinition = z.infer<
  typeof EmbeddingModelDefinitionSchema
>;

export const OpenAIProviderConfigSchema = z.object({
  apiKey: z.string().optional(),
  organization: z.string().optional(),
  baseURL: z.string().optional(),
});

export type OpenAIProviderConfig = z.infer<typeof OpenAIProviderConfigSchema>;

export const AnthropicProviderConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
});

export type AnthropicProviderConfig = z.infer<
  typeof AnthropicProviderConfigSchema
>;

export const GoogleProviderConfigSchema = z.object({
  apiKey: z.string().optional(),
});

export type GoogleProviderConfig = z.infer<typeof GoogleProviderConfigSchema>;

export const AzureProviderConfigSchema = z.object({
  apiKey: z.string().optional(),
  resourceName: z.string().optional(),
  deploymentName: z.string().optional(),
  apiVersion: z.string().optional(),
});

export type AzureProviderConfig = z.infer<typeof AzureProviderConfigSchema>;

export const OllamaProviderConfigSchema = z.object({
  baseURL: z.string(),
});

export type OllamaProviderConfig = z.infer<typeof OllamaProviderConfigSchema>;

export const ProviderConfigSchema = z.object({
  openai: OpenAIProviderConfigSchema,
  anthropic: AnthropicProviderConfigSchema,
  google: GoogleProviderConfigSchema,
  azure: AzureProviderConfigSchema,
  ollama: OllamaProviderConfigSchema,
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export const EmbeddingConfigSchema = z.object({
  dimensions: z.number().int().positive(),
  maxTokens: z.number().int().positive(),
  batchSize: z.number().int().positive(),
});

export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;

export const EngineConfigSchema = z.object({
  baseURL: z.string(),
  gpuURL: z.string(),
  timeout: z.number().int().positive(),
});

export type EngineConfig = z.infer<typeof EngineConfigSchema>;

export const CompletionConfigSchema = z.object({
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().positive(),
  topP: z.number().min(0).max(1),
});

export type CompletionConfig = z.infer<typeof CompletionConfigSchema>;

export const AgentRuntimeConfigSchema = z.object({
  maxSteps: z.number().int().positive(),
  maxTokensPerStep: z.number().int().positive(),
  timeoutMs: z.number().int().positive(),
  maxToolRoundtrips: z.number().int().positive(),
  enableParallelTools: z.boolean(),
});

export type AgentRuntimeConfig = z.infer<typeof AgentRuntimeConfigSchema>;

export const AIConfigSchema = z.object({
  defaultProvider: ProviderIdSchema,
  defaultChatModel: z.string(),
  defaultEmbeddingModel: z.string(),
  providers: ProviderConfigSchema,
  embedding: EmbeddingConfigSchema,
  completion: CompletionConfigSchema,
  agent: AgentRuntimeConfigSchema,
  engine: EngineConfigSchema,
});

export type AIConfig = z.infer<typeof AIConfigSchema>;
