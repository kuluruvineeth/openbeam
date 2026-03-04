import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import pino from "pino";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { z } from "zod";
import { AgentManager } from "./agent-manager";
import { generateStructuredAgentResponse } from "./agent-response-loop";
import { AgentStorage } from "./agent-storage";
import { createAgentMcpServer } from "./mcp-server";
import { createAllClients, shutdownProviders } from "./provider-registry";

const CODEX_TEST_MODEL = "gpt-5.1-codex-mini";
const CODEX_TEST_THINKING_OPTION_ID = "low";

const hasOpenAICredentials = !!process.env.OPENAI_API_KEY;
const hasClaudeCredentials =
  !!process.env.CLAUDE_CODE_OAUTH_TOKEN || !!process.env.ANTHROPIC_API_KEY;
const shouldRun =
  !process.env.CI && (hasOpenAICredentials || hasClaudeCredentials);

type AgentMcpServerHandle = {
  url: string;
  close: () => Promise<void>;
};

async function startAgentMcpServer(
  logger: pino.Logger
): Promise<AgentMcpServerHandle> {
  const app = express();
  app.use(express.json());
  const httpServer = createServer(app);

  const registryDir = mkdtempSync(path.join(tmpdir(), "agent-mcp-registry-"));
  const storagePath = path.join(registryDir, "agents");
  const agentStorage = new AgentStorage(storagePath, logger);
  const agentManager = new AgentManager({
    clients: {},
    registry: agentStorage,
    logger,
  });

  let allowedHosts: string[] | undefined;
  const agentMcpTransports = new Map<string, StreamableHTTPServerTransport>();

  const createAgentMcpTransport = async (callerAgentId?: string) => {
    const mcpServer = await createAgentMcpServer({
      agentManager,
      agentStorage,
      callerAgentId,
      logger,
    });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        agentMcpTransports.set(sessionId, transport);
      },
      onsessionclosed: (sessionId) => {
        agentMcpTransports.delete(sessionId);
      },
      enableDnsRebindingProtection: true,
      ...(allowedHosts ? { allowedHosts } : {}),
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        agentMcpTransports.delete(transport.sessionId);
      }
    };
    transport.onerror = () => {
      // Ignore errors in test
    };

    await mcpServer.connect(transport);
    return transport;
  };

  const handleAgentMcpRequest: express.RequestHandler = async (req, res) => {
    try {
      const sessionId = req.header("mcp-session-id");
      let transport = sessionId ? agentMcpTransports.get(sessionId) : undefined;

      if (!transport) {
        if (req.method !== "POST") {
          res.status(400).json({
            jsonrpc: "2.0",
            error: { code: -32_000, message: "Missing or invalid MCP session" },
            id: null,
          });
          return;
        }

        const body = req.body;
        if (!isInitializeRequest(body)) {
          res.status(400).json({
            jsonrpc: "2.0",
            error: {
              code: -32_600,
              message: "First request must be initialize",
            },
            id: null,
          });
          return;
        }

        transport = await createAgentMcpTransport();
      }

      await transport.handleRequest(req, res, req.body);
    } catch (_error) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32_603, message: "Internal MCP server error" },
          id: null,
        });
      }
    }
  };

  app.post("/mcp/agents", handleAgentMcpRequest);
  app.get("/mcp/agents", handleAgentMcpRequest);
  app.delete("/mcp/agents", handleAgentMcpRequest);

  const port = await new Promise<number>((resolve) => {
    httpServer.listen(0, () => {
      const address = httpServer.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    });
  });

  allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  const url = `http://127.0.0.1:${port}/mcp/agents`;

  return {
    url,
    close: async () => {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      rmSync(registryDir, { recursive: true, force: true });
    },
  };
}

(shouldRun ? describe : describe.skip)(
  "getStructuredAgentResponse (e2e)",
  () => {
    let manager: AgentManager;
    let cwd: string;
    let agentMcpServer: AgentMcpServerHandle;
    const logger = pino({ level: "silent" });

    beforeAll(async () => {
      agentMcpServer = await startAgentMcpServer(logger);
    });

    afterAll(async () => {
      await agentMcpServer?.close();
    });

    // biome-ignore lint/suspicious/useAwait: async signature required by interface
    beforeEach(async () => {
      cwd = mkdtempSync(path.join(tmpdir(), "agent-response-loop-"));
      manager = new AgentManager({
        clients: createAllClients(logger),
        logger,
      });
    });

    afterEach(async () => {
      rmSync(cwd, { recursive: true, force: true });
      await shutdownProviders(logger);
    }, 60_000);

    test.runIf(hasOpenAICredentials)(
      "returns schema-valid JSON from a real Codex agent",
      async () => {
        const schema = z.object({
          title: z.string(),
          count: z.number(),
        });

        const result = await generateStructuredAgentResponse({
          manager,
          agentConfig: {
            provider: "codex",
            model: CODEX_TEST_MODEL,
            thinkingOptionId: CODEX_TEST_THINKING_OPTION_ID,
            cwd,
            title: "Structured Response Test",
          },
          prompt: "Return JSON with a short title and count 2.",
          schema,
          maxRetries: 1,
        });

        expect(result.title.length).toBeGreaterThan(0);
        expect(typeof result.count).toBe("number");
      },
      180_000
    );

    test.runIf(hasClaudeCredentials)(
      "returns schema-valid JSON from Claude Haiku",
      async () => {
        const schema = z.object({
          message: z.string(),
        });

        let result: { message: string } | null = null;
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            result = await generateStructuredAgentResponse({
              manager,
              agentConfig: {
                provider: "claude",
                model: "haiku",
                thinkingOptionId: "on",
                cwd,
                title: "Claude Haiku Structured Test",
                internal: true,
              },
              prompt:
                'Respond with exactly this JSON (no markdown, no extra keys, no extra text): {"message":"hello"}',
              schema,
              maxRetries: 6,
            });
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
          }
        }
        if (!result) {
          throw lastError;
        }

        expect(result.message.trim().toLowerCase()).toBe("hello");
      },
      180_000
    );
  }
);
