import { afterEach, describe, expect, it } from "bun:test";
import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pino from "pino";
import { createDaemon, type OpenPlaneDaemon } from "../bootstrap.js";
import type { DaemonConfig } from "../config.js";

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

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `openplane-boot-test-${randomBytes(8).toString("hex")}`
  );
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

describe("createDaemon", () => {
  const tempDirs: string[] = [];
  const daemons: OpenPlaneDaemon[] = [];

  afterEach(async () => {
    for (const daemon of daemons) {
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      await daemon.stop().catch(() => {});
    }
    daemons.length = 0;

    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("creates a daemon with server ID", async () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const port = await getAvailablePort();
    const config = createTestConfig(dir, port);
    const daemon = await createDaemon(config, silentLogger);
    daemons.push(daemon);

    // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
    expect(daemon.serverId).toMatch(/^srv_/);
    expect(daemon.config).toBe(config);
  });

  it("starts and responds to health check", async () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const port = await getAvailablePort();
    const config = createTestConfig(dir, port);
    const daemon = await createDaemon(config, silentLogger);
    daemons.push(daemon);

    await daemon.start();

    const response = await fetch(`http://127.0.0.1:${port}/health`);
    expect(response.ok).toBe(true);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body.status).toBe("ok");
    expect(body.serverId).toBe(daemon.serverId);
    expect(body.version).toBe("0.1.0");
    expect(typeof body.uptime).toBe("number");
  });

  it("responds to info endpoint", async () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const port = await getAvailablePort();
    const config = createTestConfig(dir, port);
    const daemon = await createDaemon(config, silentLogger);
    daemons.push(daemon);

    await daemon.start();

    const response = await fetch(`http://127.0.0.1:${port}/info`);
    expect(response.ok).toBe(true);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body.serverId).toBe(daemon.serverId);
    expect(body.publicKey).toBeTruthy();
    expect(body.relay).toBeNull();
    expect(body.mcp).toBe(false);
  });

  it("blocks disallowed hosts", async () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const port = await getAvailablePort();
    const config = createTestConfig(dir, port);
    config.allowedHosts = ["allowed.com"];
    const daemon = await createDaemon(config, silentLogger);
    daemons.push(daemon);

    await daemon.start();

    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      headers: { Host: "evil.com" },
    });
    expect(response.status).toBe(403);
  });

  it("accepts WebSocket upgrade on /ws", async () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const port = await getAvailablePort();
    const config = createTestConfig(dir, port);
    const daemon = await createDaemon(config, silentLogger);
    daemons.push(daemon);

    await daemon.start();

    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const opened = await new Promise<boolean>((resolve) => {
      ws.onopen = () => resolve(true);
      ws.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 5000);
    });

    expect(opened).toBe(true);
    ws.close();
  });

  it("stops cleanly", async () => {
    const dir = createTempDir();
    tempDirs.push(dir);

    const port = await getAvailablePort();
    const config = createTestConfig(dir, port);
    const daemon = await createDaemon(config, silentLogger);
    daemons.push(daemon);

    await daemon.start();

    const beforeStop = await fetch(`http://127.0.0.1:${port}/health`);
    expect(beforeStop.ok).toBe(true);

    await daemon.stop();

    const afterStop = await fetch(`http://127.0.0.1:${port}/health`).catch(
      () => null
    );
    expect(afterStop).toBeNull();
  });
});
