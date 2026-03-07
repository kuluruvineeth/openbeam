import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  AgentSnapshotPayload,
  SessionOutboundMessage,
} from "@openbeam/types/services/daemon/messages";
import pino from "pino";
import { createDaemon, type OpenBeamDaemon } from "../src/bootstrap";
import { DaemonClient } from "../src/client/daemon-client";
import type { DaemonConfig } from "../src/config";

const silentLogger = pino({ level: "silent" });

// biome-ignore lint/suspicious/useAwait: async signature required by interface
async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        server.close();
        reject(new Error("Failed to get port"));
        return;
      }
      const port = addr.port;
      server.close(() => resolve(port));
    });
  });
}

function createTempDir(prefix = "openbeam-e2e"): string {
  const dir = join(tmpdir(), `${prefix}-${randomBytes(8).toString("hex")}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function createTestConfig(daemonHome: string, port: number): DaemonConfig {
  return {
    listen: `127.0.0.1:${port}`,
    daemonHome,
    corsAllowedOrigins: [],
    allowedHosts: undefined,
    mcpEnabled: false,
    mcpDebug: false,
    agentStoragePath: join(daemonHome, "agents"),
    staticDir: join(daemonHome, "public"),
    relayEnabled: false,
    relayEndpoint: "",
    relayPublicEndpoint: "",
    appBaseUrl: "",
  };
}

export interface DaemonTestContext {
  daemon: OpenBeamDaemon & { port: number; daemonHome: string };
  client: DaemonClient;
  cleanup: () => Promise<void>;
}

export async function createDaemonTestContext(): Promise<DaemonTestContext> {
  const daemonHome = createTempDir();
  const port = await getAvailablePort();
  const config = createTestConfig(daemonHome, port);
  const daemon = await createDaemon(config, silentLogger);
  await daemon.start();

  const client = new DaemonClient({
    url: `ws://127.0.0.1:${port}/ws`,
    logger: {
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      debug: () => {},
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      info: () => {},
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      warn: () => {},
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      error: () => {},
    },
  });
  await client.connect();

  return {
    daemon: Object.assign(daemon, { port, daemonHome }),
    client,
    cleanup: async () => {
      await client.close();
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      await daemon.stop().catch(() => {});
      rmSync(daemonHome, { recursive: true, force: true });
    },
  };
}

export function tmpCwd(prefix = "daemon-e2e"): string {
  return mkdtempSync(join(tmpdir(), `${prefix}-`));
}

export interface MessageCollector {
  messages: SessionOutboundMessage[];
  clear: () => void;
  unsubscribe: () => void;
}

export function createMessageCollector(client: DaemonClient): MessageCollector {
  const messages: SessionOutboundMessage[] = [];
  const unsubscribe = client.subscribeRawMessages((message) => {
    messages.push(message);
  });
  return {
    messages,
    clear: () => {
      messages.length = 0;
    },
    unsubscribe,
  };
}

export function extractAssistantText(
  messages: SessionOutboundMessage[],
  agentId: string
): string {
  const parts: string[] = [];
  for (const m of messages) {
    if (m.type !== "agent_stream") {
      continue;
    }
    if (m.payload.agentId !== agentId) {
      continue;
    }
    if (m.payload.event.type !== "timeline") {
      continue;
    }
    const item = m.payload.event.item;
    if (item.type === "assistant_message") {
      parts.push(item.text);
    }
  }
  return parts.join("");
}

export async function waitForCondition(
  predicate: () => boolean,
  timeoutMs: number,
  intervalMs = 25
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for condition`);
}

// biome-ignore lint/suspicious/useAwait: async signature required by interface
// biome-ignore lint/nursery/useMaxParams: callback signature
export async function waitForAgentUpdate(
  messages: SessionOutboundMessage[],
  agentId: string,
  predicate: (agent: AgentSnapshotPayload) => boolean,
  timeoutMs = 10_000,
  startPosition = 0
): Promise<AgentSnapshotPayload> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      clearInterval(interval);
      reject(new Error("Timeout waiting for agent_update"));
    }, timeoutMs);

    const check = (): void => {
      for (let i = startPosition; i < messages.length; i++) {
        // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
        const msg = messages[i]!;
        if (
          msg.type === "agent_update" &&
          msg.payload.kind === "upsert" &&
          msg.payload.agent.id === agentId &&
          predicate(msg.payload.agent)
        ) {
          clearTimeout(timeout);
          clearInterval(interval);
          resolve(msg.payload.agent);
          return;
        }
      }
    };

    const interval = setInterval(check, 50);
  });
}

export const TEST_MODEL = "gpt-5.1-codex-mini";
export const TEST_THINKING_OPTION_ID = "low";
