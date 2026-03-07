import { z } from "zod";
import type { AgentClient, AgentProvider } from "./agent";
import type { LocalSpeechProviderConfig } from "./speech";

export const ListenTargetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("tcp"),
    host: z.string(),
    port: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("socket"),
    path: z.string(),
  }),
]);

export type ListenTarget = z.infer<typeof ListenTargetSchema>;

export const PidLockInfoSchema = z.object({
  pid: z.number().int().positive(),
  startedAt: z.string(),
  hostname: z.string(),
  uid: z.number().int().nonnegative(),
  sockPath: z.string(),
});

export type PidLockInfo = z.infer<typeof PidLockInfoSchema>;

export const AllowedHostsConfigSchema = z.object({
  allowed: z.array(z.string()).optional(),
  denied: z.array(z.string()).optional(),
});

export type AllowedHostsConfig = z.infer<typeof AllowedHostsConfigSchema>;

export type AgentProviderRuntimeSettingsMap = Partial<
  Record<string, Record<string, unknown>>
>;

export type SpeechProviderConfig = {
  apiKey?: string;
  stt?: Record<string, unknown>;
  tts?: Record<string, unknown>;
  realtimeTranscriptionModel?: string;
};

export type DaemonSpeechConfig = {
  providers: {
    dictationStt: { provider: string; explicit: boolean; enabled?: boolean };
    voiceStt: { provider: string; explicit: boolean; enabled?: boolean };
    voiceTts: { provider: string; explicit: boolean; enabled?: boolean };
  };
  local?: LocalSpeechProviderConfig;
};

export type DaemonConfig = {
  listen: string;
  openbeamHome: string;
  corsAllowedOrigins: string[];
  allowedHosts?: AllowedHostsConfig;
  mcpEnabled?: boolean;
  staticDir: string;
  mcpDebug: boolean;
  agentClients: Partial<Record<AgentProvider, AgentClient>>;
  agentStoragePath: string;
  relayEnabled?: boolean;
  relayEndpoint?: string;
  relayPublicEndpoint?: string;
  appBaseUrl?: string;
  speechProvider?: SpeechProviderConfig;
  speech?: DaemonSpeechConfig;
  voiceLlmProvider?: AgentProvider | null;
  voiceLlmProviderExplicit?: boolean;
  voiceLlmModel?: string | null;
  dictationFinalTimeoutMs?: number;
  downloadTokenTtlMs?: number;
  agentProviderSettings?: AgentProviderRuntimeSettingsMap;
};

export const DEFAULT_DAEMON_PORT = 6868;
export const DEFAULT_DAEMON_LISTEN = `127.0.0.1:${DEFAULT_DAEMON_PORT}`;

/** Parse a listen string into a structured ListenTarget. */
export function parseListenString(listen: string): ListenTarget {
  if (
    listen.startsWith("/") ||
    listen.startsWith("~") ||
    listen.includes(".sock")
  ) {
    return { type: "socket", path: listen };
  }
  if (listen.startsWith("unix://")) {
    return { type: "socket", path: listen.slice(7) };
  }
  if (listen.includes(":")) {
    const colonIndex = listen.lastIndexOf(":");
    const host = listen.slice(0, colonIndex) || "127.0.0.1";
    const port = Number.parseInt(listen.slice(colonIndex + 1), 10);
    if (!Number.isFinite(port)) {
      throw new Error(`Invalid port in listen string: ${listen}`);
    }
    return { type: "tcp", host, port };
  }
  const port = Number.parseInt(listen, 10);
  if (Number.isFinite(port)) {
    return { type: "tcp", host: "127.0.0.1", port };
  }
  throw new Error(`Invalid listen string: ${listen}`);
}
