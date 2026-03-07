import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    SERVER_INTERNAL_URL: z.string().url().optional(),
  },
  client: {
    NEXT_PUBLIC_WEB_URL: z
      .string()
      .url()
      .optional()
      .default("http://localhost:3001"),
    NEXT_PUBLIC_SERVER_URL: z
      .string()
      .url()
      .optional()
      .default("http://localhost:3000"),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z
      .string()
      .url()
      .optional()
      .default("https://us.i.posthog.com"),
    NEXT_PUBLIC_LIVEKIT_WS_URL: z
      .string()
      .optional()
      .default("ws://localhost:7880"),
    NEXT_PUBLIC_AGENTIC_RUNTIME_STREAM_V2: z
      .enum(["true", "false"])
      .optional()
      .default("true"),
  },
  runtimeEnv: {
    SERVER_INTERNAL_URL: process.env.SERVER_INTERNAL_URL,
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_LIVEKIT_WS_URL: process.env.NEXT_PUBLIC_LIVEKIT_WS_URL,
    NEXT_PUBLIC_AGENTIC_RUNTIME_STREAM_V2:
      process.env.NEXT_PUBLIC_AGENTIC_RUNTIME_STREAM_V2,
  },
  skipValidation:
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.npm_lifecycle_event === "lint",
});
