import pino from "pino";
import { describe, expect, it, vi } from "vitest";
import type { AgentManager } from "./agent-manager.js";
import { generateAndApplyAgentMetadata } from "./agent-metadata-generator.js";

const logger = pino({ level: "silent" });

describe("agent-metadata-generator provider selection", () => {
  it("puts preferred provider first with fallbacks when supplied", async () => {
    const generateStructured = vi.fn(async () => ({ title: "Metadata Title" }));
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    const setTitle = vi.fn(async () => {});

    await generateAndApplyAgentMetadata({
      agentManager: { setTitle } as unknown as AgentManager,
      agentId: "agent-1",
      cwd: "/tmp",
      preferredProvider: "codex",
      initialPrompt: "Generate metadata for this prompt",
      explicitTitle: null,
      logger,
      deps: {
        generateStructuredAgentResponseWithFallback:
          generateStructured as unknown as typeof import("./agent-response-loop.js").generateStructuredAgentResponseWithFallback,
        getCheckoutStatus: async () => ({ isGit: false }),
      },
    });

    expect(generateStructured).toHaveBeenCalledTimes(1);
    const providers = generateStructured.mock.calls[0]?.[0]?.providers;
    expect(providers[0]).toEqual({
      provider: "codex",
      model: "gpt-5.1-codex-mini",
    });
    expect(providers.length).toBeGreaterThan(1);
    expect(
      providers
        .slice(1)
        .every((p: { provider: string }) => p.provider !== "codex")
    ).toBe(true);
    expect(setTitle).toHaveBeenCalledWith("agent-1", "Metadata Title");
  });

  it("uses the preferred model when both provider and model are supplied", async () => {
    const generateStructured = vi.fn(async () => ({ title: "Metadata Title" }));
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    const setTitle = vi.fn(async () => {});

    await generateAndApplyAgentMetadata({
      agentManager: { setTitle } as unknown as AgentManager,
      agentId: "agent-1b",
      cwd: "/tmp",
      preferredProvider: "codex",
      preferredModel: "gpt-5.2-codex",
      initialPrompt: "Generate metadata for this prompt",
      explicitTitle: null,
      logger,
      deps: {
        generateStructuredAgentResponseWithFallback:
          generateStructured as unknown as typeof import("./agent-response-loop.js").generateStructuredAgentResponseWithFallback,
        getCheckoutStatus: async () => ({ isGit: false }),
      },
    });

    expect(generateStructured).toHaveBeenCalledTimes(1);
    const providers = generateStructured.mock.calls[0]?.[0]?.providers;
    expect(providers[0]).toEqual({ provider: "codex", model: "gpt-5.2-codex" });
    expect(providers.length).toBeGreaterThan(1);
  });

  it("falls back to default provider ordering when no preferred provider is supplied", async () => {
    const generateStructured = vi.fn(async () => ({ title: "Metadata Title" }));
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
    const setTitle = vi.fn(async () => {});

    await generateAndApplyAgentMetadata({
      agentManager: { setTitle } as unknown as AgentManager,
      agentId: "agent-2",
      cwd: "/tmp",
      initialPrompt: "Generate metadata for this prompt",
      explicitTitle: null,
      logger,
      deps: {
        generateStructuredAgentResponseWithFallback:
          generateStructured as unknown as typeof import("./agent-response-loop.js").generateStructuredAgentResponseWithFallback,
        getCheckoutStatus: async () => ({ isGit: false }),
      },
    });

    expect(generateStructured).toHaveBeenCalledTimes(1);
    expect(generateStructured.mock.calls[0]?.[0]?.providers).toEqual([
      { provider: "claude", model: "haiku" },
      { provider: "codex", model: "gpt-5.1-codex-mini" },
      { provider: "opencode", model: "opencode/kimi-k2.5-free" },
    ]);
  });
});
