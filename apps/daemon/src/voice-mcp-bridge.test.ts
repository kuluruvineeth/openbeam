import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { experimental_createMCPClient } from "ai";
import pino from "pino";
import { describe, expect, test } from "vitest";
import { z } from "zod";

import { createVoiceMcpSocketBridgeManager } from "./voice-mcp-bridge";

describe("voice MCP bridge", () => {
  test("proxies stdio MCP bytes through per-agent unix socket bridge", async () => {
    const tmpRoot = await mkdtemp(
      path.join(os.tmpdir(), "openbeam-voice-mcp-bridge-")
    );
    const callerAgentId = "voice-agent-bridge-test";

    const bridgeManager = createVoiceMcpSocketBridgeManager({
      runtimeDir: tmpRoot,
      logger: pino({ level: "silent" }),
      // biome-ignore lint/suspicious/useAwait: async signature required by interface
      createAgentMcpServerForCaller: async (callerId) => {
        const server = new McpServer({
          name: "bridge-test-server",
          version: "1.0.0",
        });

        server.registerTool(
          "echo_caller",
          {
            value: z.string().optional(),
          },
          async (args) => ({
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  callerAgentId: callerId,
                  value: args.value ?? null,
                }),
              },
            ],
            structuredContent: {
              callerAgentId: callerId,
              value: args.value ?? null,
            },
          })
        );

        return server;
      },
    });

    const socketPath = await bridgeManager.ensureBridgeForCaller(callerAgentId);

    const bridgeScript = path.resolve(
      process.cwd(),
      "scripts/mcp-stdio-socket-bridge-cli.mjs"
    );

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [bridgeScript, "--socket", socketPath],
    });

    const client = await experimental_createMCPClient({ transport });

    try {
      const result = await client.callTool({
        name: "echo_caller",
        args: { value: "ok" },
      });

      const payload =
        (
          result as {
            structuredContent?: {
              callerAgentId?: string;
              value?: string | null;
            };
          }
        ).structuredContent ?? null;

      expect(payload?.callerAgentId).toBe(callerAgentId);
    } finally {
      await client.close();
      await bridgeManager.stop();
      await rm(tmpRoot, { recursive: true, force: true });
    }
  }, 30_000);
});
