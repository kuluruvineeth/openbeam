import { z } from "zod";

const ObservabilityConfigSchema = z.object({
  logLevel: z.string().default("info"),
  nodeEnv: z.string().default("development"),
  appVersion: z.string().default("0.0.0"),
  otelEnabled: z.boolean().default(true),
  otelExporterOtlpEndpoint: z.string().optional(),
});

export type ObservabilityConfig = z.infer<typeof ObservabilityConfigSchema>;

export function loadObservabilityConfig(
  env: NodeJS.ProcessEnv = process.env
): ObservabilityConfig {
  return ObservabilityConfigSchema.parse({
    logLevel: env.LOG_LEVEL,
    nodeEnv: env.NODE_ENV,
    appVersion: env.APP_VERSION,
    otelEnabled: env.OTEL_ENABLED !== "false",
    otelExporterOtlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
  });
}
