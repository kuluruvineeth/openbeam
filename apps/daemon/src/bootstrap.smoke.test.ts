import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pino from "pino";
import { describe, expect, test } from "vitest";

import { createOpenPlaneDaemon, type OpenPlaneDaemonConfig } from "./bootstrap";
import { createTestAgentClients } from "./test-utils/fake-agent-client";
import { createTestOpenPlaneDaemon } from "./test-utils/openplane-daemon";

describe("openplane daemon bootstrap", () => {
  test("starts and serves health endpoint", async () => {
    const daemonHandle = await createTestOpenPlaneDaemon({
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
    const openplaneHomeRoot = await mkdtemp(
      path.join(os.tmpdir(), "openplane-openai-config-")
    );
    const openplaneHome = path.join(openplaneHomeRoot, ".openplane");
    const staticDir = await mkdtemp(
      path.join(os.tmpdir(), "openplane-static-")
    );
    await mkdir(openplaneHome, { recursive: true });

    const config: OpenPlaneDaemonConfig = {
      listen: "127.0.0.1:0",
      openplaneHome,
      corsAllowedOrigins: [],
      allowedHosts: true,
      mcpEnabled: false,
      staticDir,
      mcpDebug: false,
      agentClients: createTestAgentClients(),
      agentStoragePath: path.join(openplaneHome, "agents"),
      relayEnabled: false,
      appBaseUrl: "https://app.openplane.sh",
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
        createOpenPlaneDaemon(config, pino({ level: "silent" }))
      ).rejects.toThrow("Missing OpenAI credentials");
    } finally {
      await rm(openplaneHomeRoot, { recursive: true, force: true });
      await rm(staticDir, { recursive: true, force: true });
    }
  });
});
