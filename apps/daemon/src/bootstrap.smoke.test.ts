import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pino from "pino";
import { describe, expect, test } from "vitest";

import { createOpenBeamDaemon, type OpenBeamDaemonConfig } from "./bootstrap";
import { createTestAgentClients } from "./test-utils/fake-agent-client";
import { createTestOpenBeamDaemon } from "./test-utils/openbeam-daemon";

describe("openbeam daemon bootstrap", () => {
  test("starts and serves health endpoint", async () => {
    const daemonHandle = await createTestOpenBeamDaemon({
      openai: { apiKey: "test-openai-api-key" },
      speech: {
        providers: {
          dictationStt: { provider: "openai", explicit: true },
          voiceStt: { provider: "openai", explicit: true },
          voiceTts: { provider: "openai", explicit: true },
        },
      },
    });
    try {
      const response = await fetch(
        `http://127.0.0.1:${daemonHandle.port}/api/health`,
        {
          headers: daemonHandle.agentMcpAuthHeader
            ? { Authorization: daemonHandle.agentMcpAuthHeader }
            : undefined,
        }
      );
      expect(response.ok).toBe(true);
      const payload = await response.json();
      expect(payload.status).toBe("ok");
      expect(typeof payload.timestamp).toBe("string");
    } finally {
      await daemonHandle.close();
    }
  });

  test("fails fast when OpenAI speech provider is configured without credentials", async () => {
    const openbeamHomeRoot = await mkdtemp(
      path.join(os.tmpdir(), "openbeam-openai-config-")
    );
    const openbeamHome = path.join(openbeamHomeRoot, ".openbeam");
    const staticDir = await mkdtemp(path.join(os.tmpdir(), "openbeam-static-"));
    await mkdir(openbeamHome, { recursive: true });

    const config: OpenBeamDaemonConfig = {
      listen: "127.0.0.1:0",
      openbeamHome,
      corsAllowedOrigins: [],
      allowedHosts: true,
      mcpEnabled: false,
      staticDir,
      mcpDebug: false,
      agentClients: createTestAgentClients(),
      agentStoragePath: path.join(openbeamHome, "agents"),
      relayEnabled: false,
      appBaseUrl: "https://app.openbeam.sh",
      openai: undefined,
      speech: {
        providers: {
          dictationStt: { provider: "openai", explicit: true },
          voiceStt: { provider: "openai", explicit: true },
          voiceTts: { provider: "openai", explicit: true },
        },
      },
    };

    try {
      await expect(
        createOpenBeamDaemon(config, pino({ level: "silent" }))
      ).rejects.toThrow("Missing OpenAI credentials");
    } finally {
      await rm(openbeamHomeRoot, { recursive: true, force: true });
      await rm(staticDir, { recursive: true, force: true });
    }
  });
});
