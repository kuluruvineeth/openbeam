import { describe, expect, it } from "bun:test";
import { renderTeams } from "../../src/renderers/teams";

describe("renderTeams", () => {
  it("wraps response in Adaptive Card attachment", () => {
    const payload = renderTeams({ type: "text", text: "Hello" });
    expect(payload.type).toBe("message");
    expect(payload.attachments).toHaveLength(1);
    const card = payload.attachments[0].content;
    expect(card.type).toBe("AdaptiveCard");
    expect(card.version).toBe("1.5");
  });

  it("renders search results with TextBlocks", () => {
    const payload = renderTeams({
      type: "search_results",
      text: "Found results",
      title: "Search: deploy",
      results: [
        {
          title: "Deploy Guide",
          snippet: "Steps...",
          url: "https://x.co/1",
          source: "confluence",
          score: 0.9,
        },
      ],
    });
    const card = payload.attachments[0].content;
    expect(card.body[0].text).toBe("Search: deploy");
    expect(card.body[0].weight).toBe("bolder");
    expect(card.actions?.some((a) => a.type === "Action.OpenUrl")).toBe(true);
  });

  it("renders answer with FactSet for citations", () => {
    const payload = renderTeams({
      type: "answer",
      text: "The deploy process uses Actions.",
      citations: [{ index: 1, title: "Guide", url: "https://x.co/1" }],
    });
    const card = payload.attachments[0].content;
    const factSet = card.body.find(
      (e) => (e as Record<string, unknown>).type === "FactSet"
    );
    expect(factSet).toBeDefined();
  });

  it("renders error with attention color", () => {
    const payload = renderTeams({ type: "error", text: "Failed" });
    const card = payload.attachments[0].content;
    expect(card.body[0].color).toBe("attention");
  });

  it("adds follow-up actions", () => {
    const payload = renderTeams({
      type: "text",
      text: "Hello",
      followUps: ["More info"],
    });
    const card = payload.attachments[0].content;
    expect(card.actions?.some((a) => a.type === "Action.Submit")).toBe(true);
  });
});
