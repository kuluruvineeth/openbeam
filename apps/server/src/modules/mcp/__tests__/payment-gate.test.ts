import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Hono } from "hono";

const mockGetMetadata = mock(() => undefined as unknown);
const mockPaymentConfig = {
  enabled: false,
  payeeAddress: "0xTEST",
  network: "eip155:84532",
  facilitatorUrl: "https://facilitator.openx402.ai",
  resourceUrl: "http://localhost:3000",
};

mock.module("@openplane/ai", () => ({
  createMCPServer: () => ({
    isInitialized: () => true,
    handleRequest: async () => ({
      result: { content: [{ type: "text", text: "ok" }], isError: false },
    }),
  }),
  createRequest: (method: string, params?: unknown) => ({
    jsonrpc: "2.0",
    id: 1,
    method,
    params,
  }),
  toolRegistry: {
    getMetadata: mockGetMetadata,
  },
}));

mock.module("@/lib/payment-config", () => ({
  paymentConfig: mockPaymentConfig,
}));

mock.module("@/middleware/auth", () => ({
  getTeamId: () => "team-123",
  requireAuth: async (_c: unknown, next: () => Promise<void>) => next(),
}));

describe("MCP payment gate", () => {
  beforeEach(() => {
    mockPaymentConfig.enabled = false;
    mockGetMetadata.mockReset();
  });

  it("allows free tools without payment check", async () => {
    mockPaymentConfig.enabled = true;
    mockGetMetadata.mockReturnValue({ name: "free_tool" });

    const { callToolHandler } = await import("../mcp.handlers");
    const app = new Hono();
    app.post("/tools/:name/call", (c) =>
      callToolHandler(c as unknown as Parameters<typeof callToolHandler>[0])
    );

    const res = await app.request("/tools/free_tool/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arguments: {} }),
    });

    expect(res.status).toBe(200);
  });

  it("returns 402 for priced tool without payment header", async () => {
    mockPaymentConfig.enabled = true;
    mockGetMetadata.mockReturnValue({
      name: "search_hybrid",
      pricing: {
        amount: "0.01",
        currency: "USDC",
        network: "eip155:84532",
        description: "Per search query",
      },
    });

    const { callToolHandler } = await import("../mcp.handlers");
    const app = new Hono();
    app.post("/tools/:name/call", (c) =>
      callToolHandler(c as unknown as Parameters<typeof callToolHandler>[0])
    );

    const res = await app.request("/tools/search_hybrid/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arguments: { query: "test" } }),
    });

    expect(res.status).toBe(402);
    const body = (await res.json()) as {
      error: string;
      paymentDetails: { amount: string };
    };
    expect(body.error).toBe("Payment required");
    expect(body.paymentDetails.amount).toBe("0.01");
  });

  it("proceeds when payment is disabled regardless of pricing", async () => {
    mockPaymentConfig.enabled = false;
    mockGetMetadata.mockReturnValue({
      name: "search_hybrid",
      pricing: { amount: "0.01", currency: "USDC", network: "eip155:84532" },
    });

    const { callToolHandler } = await import("../mcp.handlers");
    const app = new Hono();
    app.post("/tools/:name/call", (c) =>
      callToolHandler(c as unknown as Parameters<typeof callToolHandler>[0])
    );

    const res = await app.request("/tools/search_hybrid/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arguments: { query: "test" } }),
    });

    expect(res.status).toBe(200);
  });

  it("proceeds for priced tool with X-PAYMENT header", async () => {
    mockPaymentConfig.enabled = true;
    mockGetMetadata.mockReturnValue({
      name: "search_hybrid",
      pricing: { amount: "0.01", currency: "USDC", network: "eip155:84532" },
    });

    const { callToolHandler } = await import("../mcp.handlers");
    const app = new Hono();
    app.post("/tools/:name/call", (c) =>
      callToolHandler(c as unknown as Parameters<typeof callToolHandler>[0])
    );

    const res = await app.request("/tools/search_hybrid/call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PAYMENT": "valid-payment-token",
      },
      body: JSON.stringify({ arguments: { query: "test" } }),
    });

    expect(res.status).toBe(200);
  });
});
