import { describe, expect, it } from "bun:test";
import { MockSLM } from "../../mocks/mock-slm";
import { QueryRewriter } from "../rewriter";

describe("QueryRewriter", () => {
  it("rewrites query using SLM response", async () => {
    const slm = new MockSLM({
      defaultResponse: "improved search query terms",
      latencyMs: 0,
    });
    const rewriter = new QueryRewriter(slm);

    const result = await rewriter.rewrite("find docs");
    expect(result).toBe("improved search query terms");
  });

  it("falls back to original query on empty response", async () => {
    const slm = new MockSLM({
      defaultResponse: "",
      latencyMs: 0,
    });
    const rewriter = new QueryRewriter(slm);

    const result = await rewriter.rewrite("original query");
    expect(result).toBe("original query");
  });

  it("falls back to original on whitespace-only response", async () => {
    const slm = new MockSLM({
      defaultResponse: "   \n  ",
      latencyMs: 0,
    });
    const rewriter = new QueryRewriter(slm);

    const result = await rewriter.rewrite("my query");
    expect(result).toBe("my query");
  });

  it("trims whitespace from response", async () => {
    const slm = new MockSLM({
      defaultResponse: "  clean query  ",
      latencyMs: 0,
    });
    const rewriter = new QueryRewriter(slm);

    const result = await rewriter.rewrite("messy");
    expect(result).toBe("clean query");
  });

  it("uses prompt-specific responses", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setResponse(
      "API docs",
      "application programming interface documentation"
    );

    const rewriter = new QueryRewriter(slm);
    const result = await rewriter.rewrite("API docs");
    expect(result).toBe("application programming interface documentation");
  });

  it("preserves query on SLM failure", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setAvailable(false);
    const rewriter = new QueryRewriter(slm);

    await expect(rewriter.rewrite("test")).rejects.toThrow();
  });
});
