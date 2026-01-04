import { z } from "zod";

export const AnalyticsConfigSchema = z.object({
  apiKey: z.string().min(1),
  host: z.string().url().optional().default("https://us.i.posthog.com"),

  environment: z
    .enum(["development", "staging", "production"])
    .optional()
    .default("development"),
  disabled: z.boolean().optional().default(false),
  debug: z.boolean().optional().default(false),

  personProfiles: z
    .enum(["always", "identified_only"])
    .optional()
    .default("always"),
  maskAllText: z.boolean().optional().default(false),
  maskAllInputs: z.boolean().optional().default(true),

  enableSessionRecording: z.boolean().optional().default(true),
  sessionRecordingSampleRate: z.number().min(0).max(1).optional().default(1.0),

  enableFeatureFlags: z.boolean().optional().default(true),
  featureFlagsRequestTimeoutMs: z.number().optional().default(3000),
  bootstrapFeatureFlags: z
    .record(z.string(), z.union([z.boolean(), z.string()]))
    .optional(),

  enableLLMAnalytics: z.boolean().optional().default(true),
  enableGroupAnalytics: z.boolean().optional().default(true),

  flushAt: z.number().optional().default(20),
  flushInterval: z.number().optional().default(10_000),
  serverlessMode: z.boolean().optional().default(false),
});

export type AnalyticsConfig = z.infer<typeof AnalyticsConfigSchema>;

let globalConfig: AnalyticsConfig | null = null;

export function initializeAnalytics(
  config: Partial<AnalyticsConfig> & { apiKey: string }
): AnalyticsConfig {
  const parsed = AnalyticsConfigSchema.parse(config);

  if (parsed.serverlessMode) {
    parsed.flushAt = 1;
    parsed.flushInterval = 0;
  }

  globalConfig = parsed;
  return globalConfig;
}

export function getAnalyticsConfig(): AnalyticsConfig {
  if (!globalConfig) {
    throw new Error(
      "Analytics not initialized. Call initializeAnalytics() first."
    );
  }
  return globalConfig;
}

export function isAnalyticsInitialized(): boolean {
  return globalConfig !== null;
}

export function resetAnalyticsConfig(): void {
  globalConfig = null;
}
