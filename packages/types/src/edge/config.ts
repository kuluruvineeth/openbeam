import { z } from "zod";
import { EdgeTierSchema } from "./tiers";

export const SyncPolicySchema = z.object({
  mode: z
    .enum(["full", "incremental", "metadata_only", "manual"])
    .default("incremental"),
  intervalMs: z.number().int().positive().default(300_000),
  batchSize: z.number().int().positive().default(100),
  maxRetries: z.number().int().nonnegative().default(3),
  bandwidthLimitKbps: z.number().nonnegative().optional(),
  offlineQueueMaxMb: z.number().positive().default(100),
});

export type SyncPolicy = z.infer<typeof SyncPolicySchema>;

export const SearchConfigSchema = z.object({
  ftsEnabled: z.boolean().default(true),
  vectorEnabled: z.boolean().default(false),
  hybridAlpha: z.number().min(0).max(1).default(0.5),
  maxResults: z.number().int().positive().default(50),
  snippetLength: z.number().int().positive().default(200),
  ftsProvider: z.enum(["sqlite_fts5", "tantivy"]).default("sqlite_fts5"),
  vectorProvider: z.enum(["in_memory", "usearch"]).default("in_memory"),
});

export type SearchConfig = z.infer<typeof SearchConfigSchema>;

export const SlmConfigSchema = z.object({
  enabled: z.boolean().default(false),
  modelId: z.string().default("phi-3-mini"),
  maxTokens: z.number().int().positive().default(512),
  temperature: z.number().min(0).max(2).default(0.3),
  contextWindowTokens: z.number().int().positive().default(4096),
  runtime: z.enum(["llama_cpp", "tensorrt", "mock"]).default("mock"),
});

export type SlmConfig = z.infer<typeof SlmConfigSchema>;

export const FlConfigSchema = z.object({
  enabled: z.boolean().default(false),
  aggregationStrategy: z.enum(["fedavg", "fedprox"]).default("fedavg"),
  localEpochs: z.number().int().positive().default(5),
  privacyBudgetEpsilon: z.number().positive().default(1.0),
});

export type FlConfig = z.infer<typeof FlConfigSchema>;

const SYNC_POLICY_DEFAULTS = SyncPolicySchema.parse({});
const SEARCH_CONFIG_DEFAULTS = SearchConfigSchema.parse({});
const SLM_CONFIG_DEFAULTS = SlmConfigSchema.parse({});
const FL_CONFIG_DEFAULTS = FlConfigSchema.parse({});

export const EdgeConfigSchema = z.object({
  nodeId: z.string().min(1),
  tier: EdgeTierSchema,
  syncPolicy: SyncPolicySchema.default(SYNC_POLICY_DEFAULTS),
  searchConfig: SearchConfigSchema.default(SEARCH_CONFIG_DEFAULTS),
  slmConfig: SlmConfigSchema.default(SLM_CONFIG_DEFAULTS),
  flConfig: FlConfigSchema.default(FL_CONFIG_DEFAULTS),
  dataDir: z.string().default("./data"),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  maxDbSizeMb: z.number().int().positive().default(1024),
});

export type EdgeConfig = z.infer<typeof EdgeConfigSchema>;
