import { mkdir, mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";

import pino from "pino";
import type { AgentClient, AgentProvider } from "../agent/agent-sdk-types";
import {
  createOpenPlaneDaemon,
  type OpenPlaneDaemonConfig,
  type OpenPlaneOpenAIConfig,
  type OpenPlaneSpeechConfig,
} from "../bootstrap";
import { createTestAgentClients } from "./fake-agent-client";

type TestOpenPlaneDaemonOptions = {
  downloadTokenTtlMs?: number;
  corsAllowedOrigins?: string[];
  listen?: string;
  logger?: Parameters<typeof createOpenPlaneDaemon>[1];
  relayEnabled?: boolean;
  relayEndpoint?: string;
  agentClients?: Partial<Record<AgentProvider, AgentClient>>;
  openplaneHomeRoot?: string;
  staticDir?: string;
  cleanup?: boolean;
  openai?: OpenPlaneOpenAIConfig;
  speech?: OpenPlaneSpeechConfig;
  voiceLlmProvider?: OpenPlaneDaemonConfig["voiceLlmProvider"];
  voiceLlmProviderExplicit?: boolean;
  voiceLlmModel?: string | null;
  dictationFinalTimeoutMs?: number;
};

export type TestOpenPlaneDaemon = {
  config: OpenPlaneDaemonConfig;
  daemon: Awaited<ReturnType<typeof createOpenPlaneDaemon>>;
  port: number;
  openplaneHome: string;
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

export async function createTestOpenPlaneDaemon(
  options: TestOpenPlaneDaemonOptions = {}
): Promise<TestOpenPlaneDaemon> {
  const maxAttempts = 5;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const openplaneHomeRoot =
      options.openplaneHomeRoot ??
      (await mkdtemp(path.join(os.tmpdir(), "openplane-home-")));
    const openplaneHome = path.join(openplaneHomeRoot, ".openplane");
    await mkdir(openplaneHome, { recursive: true });
    const staticDir =
      options.staticDir ??
      (await mkdtemp(path.join(os.tmpdir(), "openplane-static-")));
    const port = await getAvailablePort();

    const listenHost = options.listen ?? "127.0.0.1";
    const config: OpenPlaneDaemonConfig = {
      listen: `${listenHost}:${port}`,
      openplaneHome,
      corsAllowedOrigins: options.corsAllowedOrigins ?? [],
      allowedHosts: true,
      mcpEnabled: true,
      staticDir,
      mcpDebug: false,
      agentClients: options.agentClients ?? createTestAgentClients(),
      agentStoragePath: path.join(openplaneHome, "agents"),
      relayEnabled: options.relayEnabled ?? false,
      relayEndpoint: options.relayEndpoint ?? "relay.openplane.sh:443",
      appBaseUrl: "https://app.openplane.sh",
      openai: options.openai,
      speech: options.speech,
      voiceLlmProvider: options.voiceLlmProvider ?? null,
      voiceLlmProviderExplicit: options.voiceLlmProviderExplicit ?? false,
      voiceLlmModel: options.voiceLlmModel ?? null,
      dictationFinalTimeoutMs: options.dictationFinalTimeoutMs,
      downloadTokenTtlMs: options.downloadTokenTtlMs,
    };

    const logger = options.logger ?? pino({ level: "silent" });
    const daemon = await createOpenPlaneDaemon(config, logger);
    try {
      await daemon.start();

      const close = async (): Promise<void> => {
        // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
        await daemon.stop().catch(() => {});
        // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
        await daemon.agentManager.flush().catch(() => {});
        if (options.cleanup ?? true) {
          await new Promise((r) => setTimeout(r, 50));
          await rm(openplaneHomeRoot, {
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
        openplaneHome,
        staticDir,
        close,
      };
    } catch (error) {
      lastError = error;
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      await daemon.stop().catch(() => {});
      await rm(openplaneHomeRoot, {
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
