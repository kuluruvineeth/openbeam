import { describe, expect, it } from "bun:test";
import { renderTelegram } from "../../src/renderers/telegram";

describe("renderTelegram", () => {
  it("renders search results as HTML with links", () => {
    const payload = renderTelegram({
      type: "search_results",
      text: "Found results",
      title: "Search: deploy",
      results: [
        {
          title: "Deploy Guide",
          snippet: "How to deploy...",
          url: "https://x.co/1",
          source: "confluence",
          score: 0.9,
        },
      ],
    });
    expect(payload.parse_mode).toBe("HTML");
    expect(payload.text).toContain("<b>Search: deploy</b>");
    expect(payload.text).toContain('<a href="https://x.co/1">Deploy Guide</a>');
  });

  it("renders answer with HTML citation links", () => {
    const payload = renderTelegram({
      type: "answer",
      text: "Deploy uses Actions.",
      citations: [{ index: 1, title: "Guide", url: "https://x.co/1" }],
    });
    expect(payload.text).toContain("Deploy uses Actions.");
    expect(payload.text).toContain("<i>");
    expect(payload.text).toContain("Sources");
  });

  it("adds inline keyboard for follow-ups", () => {
    const payload = renderTelegram({
      type: "text",
      text: "Hello",
      followUps: ["More details", "Search docs"],
    });
    expect(payload.reply_markup).toBeDefined();
    expect(payload.reply_markup?.inline_keyboard).toHaveLength(2);
  });

  it("escapes HTML entities", () => {
    const payload = renderTelegram({
      type: "text",
      text: "Use <script> & 'quotes'",
    });
    expect(payload.text).toContain("&lt;script&gt;");
    expect(payload.text).toContain("&amp;");
  });

  it("has no keyboard without follow-ups", () => {
    const payload = renderTelegram({ type: "text", text: "Plain" });
    expect(payload.reply_markup).toBeUndefined();
  });
});
