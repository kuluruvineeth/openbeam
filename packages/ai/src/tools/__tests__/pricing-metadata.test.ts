import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { defineTool, success } from "../builder";

describe("pricing metadata", () => {
  it("includes pricing when defined", () => {
    const tool = defineTool({
      name: "test_priced",
      description: "A test tool with pricing",
      category: "search",
      parameters: z.object({ query: z.string() }),
      pricing: { amount: "0.01", description: "Per query" },
      execute: async () => success({ result: "ok" }),
    });

    expect(tool.metadata.pricing).toEqual({
      amount: "0.01",
      currency: "USDC",
      network: "eip155:84532",
      description: "Per query",
    });
  });

  it("defaults currency and network when not specified", () => {
    const tool = defineTool({
      name: "test_defaults",
      description: "A test tool",
      category: "search",
      parameters: z.object({ query: z.string() }),
      pricing: { amount: "0.05" },
      execute: async () => success({ result: "ok" }),
    });

    expect(tool.metadata.pricing?.currency).toBe("USDC");
    expect(tool.metadata.pricing?.network).toBe("eip155:84532");
  });

  it("allows custom currency and network", () => {
    const tool = defineTool({
      name: "test_custom",
      description: "A test tool",
      category: "search",
      parameters: z.object({ query: z.string() }),
      pricing: { amount: "1.00", currency: "ETH", network: "eip155:1" },
      execute: async () => success({ result: "ok" }),
    });

    expect(tool.metadata.pricing?.currency).toBe("ETH");
    expect(tool.metadata.pricing?.network).toBe("eip155:1");
  });

  it("omits pricing when not defined", () => {
    const tool = defineTool({
      name: "test_free",
      description: "A free tool",
      category: "search",
      parameters: z.object({ query: z.string() }),
      execute: async () => success({ result: "ok" }),
    });

    expect(tool.metadata.pricing).toBeUndefined();
  });
});

describe("built-in tool pricing", () => {
  it("search_hybrid has $0.01 pricing", async () => {
    const { searchHybridTool } = await import("../definitions/search/hybrid");
    expect(searchHybridTool.metadata.pricing?.amount).toBe("0.01");
    expect(searchHybridTool.metadata.pricing?.currency).toBe("USDC");
  });

  it("search_semantic has $0.01 pricing", async () => {
    const { searchSemanticTool } = await import(
      "../definitions/search/semantic"
    );
    expect(searchSemanticTool.metadata.pricing?.amount).toBe("0.01");
  });

  it("rag_answer has $0.05 pricing", async () => {
    const { ragAnswerTool } = await import("../definitions/rag/answer");
    expect(ragAnswerTool.metadata.pricing?.amount).toBe("0.05");
  });

  it("rag_synthesize has $0.05 pricing", async () => {
    const { ragSynthesizeTool } = await import("../definitions/rag/synthesize");
    expect(ragSynthesizeTool.metadata.pricing?.amount).toBe("0.05");
  });
});
