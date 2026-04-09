import { describe, expect, it } from "bun:test";
import type { BotResponse } from "@openbeam/types/bot";
import { renderSlack } from "../../src/renderers/slack";

function searchResponse(): BotResponse {
  return {
    type: "search_results",
    text: "Found 2 results",
    title: "Search: deploy",
    results: [
      {
        title: "Deploy Guide",
        snippet: "How to deploy...",
        url: "https://x.co/1",
        source: "confluence",
        score: 0.9,
      },
      {
        title: "CI Pipeline",
        snippet: "Our CI runs...",
        source: "github",
        score: 0.8,
      },
    ],
  };
}

function answerResponse(): BotResponse {
  return {
    type: "answer",
    text: "The deploy process uses GitHub Actions.",
    citations: [
      { index: 1, title: "Deploy Guide", url: "https://x.co/1" },
      { index: 2, title: "CI Docs", url: "https://x.co/2" },
    ],
    followUps: ["Tell me more", "Search for deploy"],
  };
}

describe("renderSlack", () => {
  it("renders search results as Block Kit with header and sections", () => {
    const payload = renderSlack(searchResponse());
    expect(payload.text).toBe("Found 2 results");
    expect(payload.blocks[0]).toMatchObject({ type: "header" });
    expect(payload.blocks.length).toBeGreaterThan(1);
    const sectionTexts = payload.blocks
      .filter((b) => b.type === "section")
      .map((b) => (b.text as Record<string, string>).text);
    expect(sectionTexts.some((t) => t.includes("Deploy Guide"))).toBe(true);
  });

  it("renders answer with citation context blocks", () => {
    const payload = renderSlack(answerResponse());
    const contextBlocks = payload.blocks.filter((b) => b.type === "context");
    expect(contextBlocks.length).toBeGreaterThan(0);
  });

  it("renders follow-up buttons as actions block", () => {
    const payload = renderSlack(answerResponse());
    const actionsBlock = payload.blocks.find((b) => b.type === "actions");
    expect(actionsBlock).toBeDefined();
    const elements = actionsBlock?.elements as Record<string, unknown>[];
    expect(elements.length).toBe(2);
  });

  it("renders error response", () => {
    const payload = renderSlack({ type: "error", text: "Something broke" });
    expect(payload.blocks[0]).toMatchObject({ type: "section" });
    const text = (payload.blocks[0].text as Record<string, string>).text;
    expect(text).toContain("Something broke");
  });

  it("renders text response", () => {
    const payload = renderSlack({ type: "text", text: "Hello world" });
    expect(payload.text).toBe("Hello world");
    expect(payload.blocks[0]).toMatchObject({ type: "section" });
  });

  it("escapes special characters in mrkdwn", () => {
    const payload = renderSlack({
      type: "text",
      text: "Use <script> & 'quotes'",
    });
    const text = (payload.blocks[0].text as Record<string, string>).text;
    expect(text).toContain("&lt;script&gt;");
    expect(text).toContain("&amp;");
  });
});
