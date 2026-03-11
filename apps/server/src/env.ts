import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    PORT: z.coerce.number().optional().default(3000),
    NODE_ENV: z
      .enum(["development", "staging", "production"])
      .optional()
      .default("development"),
    LOG_LEVEL: z
      .enum(["debug", "info", "warn", "error"])
      .optional()
      .default("info"),
    APP_VERSION: z.string().optional().default("0.1.0"),

    WEB_URL: z.string().url().optional().default("http://localhost:3001"),
    SERVER_URL: z.string().url().optional().default("http://localhost:3000"),

    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

    VESPA_URL: z.string().url().optional().default("http://localhost:8080"),
    TEMPORAL_ADDRESS: z.string().optional().default("http://localhost:7233"),
    WORKER_METRICS_URL: z
      .string()
      .url()
      .optional()
      .default("http://localhost:9091"),

    LIVEKIT_API_KEY: z.string().optional().default(""),
    LIVEKIT_API_SECRET: z.string().optional().default(""),
    LIVEKIT_WS_URL: z.string().optional().default("ws://localhost:7880"),
    LIVEKIT_WEBHOOK_SECRET: z.string().optional(),

    API_KEY_PREFIX: z.string().optional().default("op_live_"),

    OTEL_ENABLED: z
      .enum(["true", "false"])
      .optional()
      .default("true")
      .transform((v) => v === "true"),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),

    DOCUMENTS_GAUGE_REFRESH_MS: z.coerce.number().optional().default(60_000),

    X402_ENABLED: z
      .enum(["true", "false"])
      .optional()
      .default("false")
      .transform((v) => v === "true"),
    X402_PAYEE_ADDRESS: z.string().optional().default(""),
    X402_NETWORK: z.string().optional().default("base-sepolia"),
    X402_FACILITATOR_URL: z
      .string()
      .url()
      .optional()
      .default("https://facilitator.openx402.ai"),
    X402_RESOURCE_URL: z
      .string()
      .url()
      .optional()
      .default("http://localhost:3000"),

    VERKADA_WEBHOOK_SECRET: z.string().optional(),
    SAMSARA_WEBHOOK_SECRET: z.string().optional(),

    WEB_APP_URL: z
      .string()
      .url()
      .optional()
      .default("https://app.openbeam.work"),
  },
  runtimeEnv: process.env,
  skipValidation:
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.NODE_ENV === "test",
});
