import { describe, expect, it } from "bun:test";
import type { BotResponse } from "@openbeam/types/bot";
import { renderWhatsApp, typingPayload } from "../../src/renderers/whatsapp";

describe("renderWhatsApp", () => {
  it("renders search results as list message", () => {
    const payload = renderWhatsApp("+1234", {
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
    expect(payload.type).toBe("interactive");
    const interactive = payload.interactive as Record<string, unknown>;
    expect(interactive.type).toBe("list");
  });

  it("renders answer with citations and bold formatting", () => {
    const response: BotResponse = {
      type: "answer",
      text: "Deploy uses GitHub Actions.",
      citations: [{ index: 1, title: "Deploy Guide", url: "https://x.co/1" }],
    };
    const payload = renderWhatsApp("+1234", response);
    expect(payload.type).toBe("text");
    const body = (payload.text as Record<string, string>).body;
    expect(body).toContain("Deploy uses GitHub Actions.");
    expect(body).toContain("_Sources_");
    expect(body).toContain("[1] Deploy Guide");
    expect(body).toContain("https://x.co/1");
  });

  it("renders follow-up buttons", () => {
    const payload = renderWhatsApp("+1234", {
      type: "text",
      text: "Hello",
      followUps: ["More info", "Search docs"],
    });
    expect(payload.type).toBe("interactive");
    const interactive = payload.interactive as Record<string, unknown>;
    expect(interactive.type).toBe("button");
  });

  it("renders plain text without follow-ups", () => {
    const payload = renderWhatsApp("+1234", {
      type: "text",
      text: "Just a message",
    });
    expect(payload.type).toBe("text");
    expect(payload.to).toBe("+1234");
  });

  it("renders error with warning prefix", () => {
    const payload = renderWhatsApp("+1234", {
      type: "error",
      text: "Something broke",
    });
    const body = (payload.text as Record<string, string>).body;
    expect(body).toContain("Something broke");
  });
});

describe("typingPayload", () => {
  it("returns read status with typing_indicator and message_id", () => {
    const payload = typingPayload("wamid.HBgNMTIz");
    expect(payload.status).toBe("read");
    expect(payload.message_id).toBe("wamid.HBgNMTIz");
    expect(payload.messaging_product).toBe("whatsapp");
    expect(payload.typing_indicator).toEqual({ type: "text" });
  });
});
