import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { AgentProvider } from "./agent/agent-sdk-types";
import { AgentProviderSchema } from "./agent/provider-manifest";
import {
  type AllowedHostsConfig,
  mergeAllowedHosts,
  parseAllowedHostsEnv,
} from "./allowed-hosts";
import type { OpenBeamDaemonConfig } from "./bootstrap";
import { loadPersistedConfig } from "./persisted-config";
import { resolveSpeechConfig } from "./speech/speech-config-resolver";

const DEFAULT_PORT = 6767;
const DEFAULT_RELAY_ENDPOINT = "relay.openbeam.sh:443";
const DEFAULT_APP_BASE_URL = "https://app.openbeam.sh";
const DEFAULT_NATIVE_HELPER_RPC_TIMEOUT_MS = 5000;

function getDefaultListen(): string {
  // Main HTTP server defaults to TCP
  return `127.0.0.1:${DEFAULT_PORT}`;
}

function getDefaultNativeHelperBinaryName(platform: NodeJS.Platform): string {
  return platform === "win32" ? "WindowsHelper.exe" : "SwiftHelper";
}

function resolveDefaultNativeHelperCommand(
  openbeamHome: string,
  platform: NodeJS.Platform = process.platform
): string | null {
  const candidate = path.join(
    openbeamHome,
    "bin",
    getDefaultNativeHelperBinaryName(platform)
  );
  return existsSync(candidate) ? candidate : null;
}

export type CliConfigOverrides = Partial<{
  listen: string;
  relayEnabled: boolean;
  mcpEnabled: boolean;
  nativeHelperEnabled: boolean;
  allowedHosts: AllowedHostsConfig;
}>;

const OptionalVoiceLlmProviderSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value): string | null =>
    typeof value === "string" ? value.trim().toLowerCase() : null
  )
  .pipe(z.union([AgentProviderSchema, z.null()]));

function parseOptionalVoiceLlmProvider(value: unknown): AgentProvider | null {
  const parsed = OptionalVoiceLlmProviderSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseBooleanEnv(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return;
}

function parsePositiveInteger(
  value: string | number | undefined
): number | undefined {
  if (value === undefined) {
    return;
  }

  const parsed =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return;
  }
  return Math.floor(parsed);
}

function normalizeOptionalString(
  value: string | null | undefined
): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseNativeHelperArgs(
  value: string | undefined
): string[] | undefined {
  if (value === undefined) {
    return;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    const schemaResult = z.array(z.string().min(1)).safeParse(parsed);
    if (schemaResult.success) {
      return schemaResult.data;
    }
  } catch {
    // Fall back to space-separated parsing for shell-friendly env values.
  }

  return trimmed
    .split(" ")
    .map((arg) => arg.trim())
    .filter((arg) => arg.length > 0);
}

export function loadConfig(
  openbeamHome: string,
  options?: {
    env?: NodeJS.ProcessEnv;
    cli?: CliConfigOverrides;
  }
): OpenBeamDaemonConfig {
  const env = options?.env ?? process.env;
  const persisted = loadPersistedConfig(openbeamHome);

  // OPENBEAM_LISTEN can be:
  // - host:port (TCP)
  // - /path/to/socket (Unix socket)
  // - unix:///path/to/socket (Unix socket)
  // Default is TCP at 127.0.0.1:6767
  const listen =
    options?.cli?.listen ??
    env.OPENBEAM_LISTEN ??
    persisted.daemon?.listen ??
    getDefaultListen();

  const envCorsOrigins = env.OPENBEAM_CORS_ORIGINS
    ? env.OPENBEAM_CORS_ORIGINS.split(",").map((s) => s.trim())
    : [];

  const persistedCorsOrigins = persisted.daemon?.cors?.allowedOrigins ?? [];

  const allowedHosts = mergeAllowedHosts([
    persisted.daemon?.allowedHosts,
    parseAllowedHostsEnv(env.OPENBEAM_ALLOWED_HOSTS),
    options?.cli?.allowedHosts,
  ]);

  const mcpEnabled =
    options?.cli?.mcpEnabled ?? persisted.daemon?.mcp?.enabled ?? true;

  const relayEnabled =
    options?.cli?.relayEnabled ?? persisted.daemon?.relay?.enabled ?? true;

  const relayEndpoint =
    env.OPENBEAM_RELAY_ENDPOINT ??
    persisted.daemon?.relay?.endpoint ??
    DEFAULT_RELAY_ENDPOINT;

  const relayPublicEndpoint =
    env.OPENBEAM_RELAY_PUBLIC_ENDPOINT ??
    persisted.daemon?.relay?.publicEndpoint ??
    relayEndpoint;

  const persistedNativeHelper = persisted.daemon?.nativeHelper;
  const defaultNativeHelperCommand =
    resolveDefaultNativeHelperCommand(openbeamHome);
  const nativeHelperEnabled =
    options?.cli?.nativeHelperEnabled ??
    parseBooleanEnv(env.OPENBEAM_NATIVE_HELPER_ENABLED) ??
    persistedNativeHelper?.enabled ??
    defaultNativeHelperCommand !== null;
  const nativeHelperCommand =
    normalizeOptionalString(env.OPENBEAM_NATIVE_HELPER_COMMAND) ??
    normalizeOptionalString(persistedNativeHelper?.command) ??
    defaultNativeHelperCommand;
  const nativeHelperArgs =
    parseNativeHelperArgs(env.OPENBEAM_NATIVE_HELPER_ARGS) ??
    persistedNativeHelper?.args ??
    [];
  const nativeHelperRpcTimeoutMs =
    parsePositiveInteger(env.OPENBEAM_NATIVE_HELPER_RPC_TIMEOUT_MS) ??
    parsePositiveInteger(persistedNativeHelper?.rpcTimeoutMs) ??
    DEFAULT_NATIVE_HELPER_RPC_TIMEOUT_MS;

  const appBaseUrl =
    env.OPENBEAM_APP_BASE_URL ?? persisted.app?.baseUrl ?? DEFAULT_APP_BASE_URL;

  const { openai, speech } = resolveSpeechConfig({
    openbeamHome,
    env,
    persisted,
  });

  const envVoiceLlmProvider = parseOptionalVoiceLlmProvider(
    env.OPENBEAM_VOICE_LLM_PROVIDER
  );
  const persistedVoiceLlmProvider = parseOptionalVoiceLlmProvider(
    persisted.features?.voiceMode?.llm?.provider
  );
  const voiceLlmProvider =
    envVoiceLlmProvider ?? persistedVoiceLlmProvider ?? null;
  const voiceLlmProviderExplicit =
    envVoiceLlmProvider !== null || persistedVoiceLlmProvider !== null;
  const voiceLlmModel = persisted.features?.voiceMode?.llm?.model ?? null;

  return {
    listen,
    openbeamHome,
    corsAllowedOrigins: Array.from(
      new Set(
        [...persistedCorsOrigins, ...envCorsOrigins].filter((s) => s.length > 0)
      )
    ),
    allowedHosts,
    mcpEnabled,
    mcpDebug: env.MCP_DEBUG === "1",
    agentStoragePath: path.join(openbeamHome, "agents"),
    staticDir: "public",
    agentClients: {},
    relayEnabled,
    relayEndpoint,
    relayPublicEndpoint,
    nativeHelper: {
      enabled: nativeHelperEnabled,
      command: nativeHelperCommand,
      args: nativeHelperArgs,
      rpcTimeoutMs: nativeHelperRpcTimeoutMs,
    },
    appBaseUrl,
    openai,
    speech,
    voiceLlmProvider,
    voiceLlmProviderExplicit,
    voiceLlmModel,
    agentProviderSettings: persisted.agents?.providers,
  };
}
