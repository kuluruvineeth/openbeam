import { describe, expect, it } from "bun:test";
import { InteractionResponseType } from "discord-api-types/v10";
import { renderDiscord } from "../../src/renderers/discord";

describe("renderDiscord", () => {
  it("renders search results as embed with fields", () => {
    const payload = renderDiscord({
      type: "search_results",
      text: "Found results",
      title: "Search: deploy",
      results: [
        {
          title: "Guide",
          snippet: "deploy steps",
          url: "https://x.co/1",
          source: "confluence",
          score: 0.9,
        },
      ],
    });
    expect(payload.type).toBe(InteractionResponseType.ChannelMessageWithSource);
    expect(payload.data.embeds).toHaveLength(1);
    expect(payload.data.embeds?.[0].title).toBe("Search: deploy");
    expect(payload.data.embeds?.[0].color).toBe(0x34_98_db);
  });

  it("renders answer with citation footer", () => {
    const payload = renderDiscord({
      type: "answer",
      text: "GitHub Actions handles deploys.",
      citations: [{ index: 1, title: "Deploy Guide", url: "https://x.co/1" }],
    });
    const embed = payload.data.embeds?.[0];
    expect(embed?.description).toContain("GitHub Actions handles deploys");
    expect(embed?.footer?.text).toContain("[1]");
  });

  it("renders error with red color", () => {
    const payload = renderDiscord({ type: "error", text: "Failed" });
    expect(payload.data.embeds?.[0].color).toBe(0xed_42_45);
  });

  it("renders action result with success color", () => {
    const payload = renderDiscord({
      type: "action_result",
      text: "Done",
      actionResult: { action: "create_issue", success: true, message: "OK" },
    });
    expect(payload.data.embeds?.[0].color).toBe(0x57_f2_87);
  });

  it("adds follow-up buttons as components", () => {
    const payload = renderDiscord({
      type: "text",
      text: "Hello",
      followUps: ["More info", "Search docs"],
    });
    expect(payload.data.components).toHaveLength(1);
    const row = payload.data.components?.[0];
    expect(row?.components).toHaveLength(2);
  });
});
