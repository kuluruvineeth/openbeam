import { mkdir, mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

import pino from "pino";
import type { AgentClient, AgentProvider } from "../agent/agent-sdk-types";
import {
  createOpenBeamDaemon,
  type OpenBeamDaemonConfig,
  type OpenBeamOpenAIConfig,
  type OpenBeamSpeechConfig,
} from "../bootstrap";
import { createTestAgentClients } from "./fake-agent-client";

type TestOpenBeamDaemonOptions = {
  downloadTokenTtlMs?: number;
  corsAllowedOrigins?: string[];
  listen?: string;
  logger?: Parameters<typeof createOpenBeamDaemon>[1];
  relayEnabled?: boolean;
  relayEndpoint?: string;
  agentClients?: Partial<Record<AgentProvider, AgentClient>>;
  openbeamHomeRoot?: string;
  staticDir?: string;
  cleanup?: boolean;
  openai?: OpenBeamOpenAIConfig;
  speech?: OpenBeamSpeechConfig;
  voiceLlmProvider?: OpenBeamDaemonConfig["voiceLlmProvider"];
  voiceLlmProviderExplicit?: boolean;
  voiceLlmModel?: string | null;
  dictationFinalTimeoutMs?: number;
};

export type TestOpenBeamDaemon = {
  config: OpenBeamDaemonConfig;
  daemon: Awaited<ReturnType<typeof createOpenBeamDaemon>>;
  port: number;
  openbeamHome: string;
  staticDir: string;
  close: () => Promise<void>;
};

// biome-ignore lint/suspicious/useAwait: async signature required by interface
async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to acquire port")));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}

export async function createTestOpenBeamDaemon(
  options: TestOpenBeamDaemonOptions = {}
): Promise<TestOpenBeamDaemon> {
  const maxAttempts = 5;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const openbeamHomeRoot =
      options.openbeamHomeRoot ??
      (await mkdtemp(path.join(os.tmpdir(), "openbeam-home-")));
    const openbeamHome = path.join(openbeamHomeRoot, ".openbeam");
    await mkdir(openbeamHome, { recursive: true });
    const staticDir =
      options.staticDir ??
      (await mkdtemp(path.join(os.tmpdir(), "openbeam-static-")));
    const port = await getAvailablePort();

    const listenHost = options.listen ?? "127.0.0.1";
    const config: OpenBeamDaemonConfig = {
      listen: `${listenHost}:${port}`,
      openbeamHome,
      corsAllowedOrigins: options.corsAllowedOrigins ?? [],
      allowedHosts: true,
      mcpEnabled: true,
      staticDir,
      mcpDebug: false,
      agentClients: options.agentClients ?? createTestAgentClients(),
      agentStoragePath: path.join(openbeamHome, "agents"),
      relayEnabled: options.relayEnabled ?? false,
      relayEndpoint: options.relayEndpoint ?? "relay.openbeam.sh:443",
      appBaseUrl: "https://app.openbeam.sh",
      openai: options.openai,
      speech: options.speech,
      voiceLlmProvider: options.voiceLlmProvider ?? null,
      voiceLlmProviderExplicit: options.voiceLlmProviderExplicit ?? false,
      voiceLlmModel: options.voiceLlmModel ?? null,
      dictationFinalTimeoutMs: options.dictationFinalTimeoutMs,
      downloadTokenTtlMs: options.downloadTokenTtlMs,
    };

    const logger = options.logger ?? pino({ level: "silent" });
    const daemon = await createOpenBeamDaemon(config, logger);
    try {
      await daemon.start();

      const close = async (): Promise<void> => {
        // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
        await daemon.stop().catch(() => {});
        // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
        await daemon.agentManager.flush().catch(() => {});
        if (options.cleanup ?? true) {
          await new Promise((r) => setTimeout(r, 50));
          await rm(openbeamHomeRoot, {
            recursive: true,
            force: true,
            maxRetries: 3,
            retryDelay: 100,
          });
          await rm(staticDir, {
            recursive: true,
            force: true,
            maxRetries: 3,
            retryDelay: 100,
          });
        }
      };

      return {
        config,
        daemon,
        port,
        openbeamHome,
        staticDir,
        close,
      };
    } catch (error) {
      lastError = error;
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      await daemon.stop().catch(() => {});
      await rm(openbeamHomeRoot, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      });
      await rm(staticDir, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      });

      if (!isAddressInUseError(error) || attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("Failed to start test daemon");
}

function isAddressInUseError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const record = error as { code?: string };
  return record.code === "EADDRINUSE";
}
