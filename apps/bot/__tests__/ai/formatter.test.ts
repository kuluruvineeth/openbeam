import { describe, expect, it } from "bun:test";
import type { BotPlatform, BotResponse } from "@openbeam/types/bot";
import { escapeMarkdownV2, formatForPlatform } from "../../src/ai/formatter";

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
        url: "https://x.co/2",
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
    results: [
      {
        title: "Deploy Guide",
        snippet: "",
        url: "https://x.co/1",
        source: "confluence",
        score: 0.9,
      },
    ],
  };
}

function expertResponse(): BotResponse {
  return {
    type: "expert_list",
    text: "Found 1 expert",
    title: "Experts: kubernetes",
    experts: [
      {
        name: "Alice",
        email: "alice@co.com",
        expertise: ["kubernetes", "docker"],
        documentCount: 42,
      },
    ],
  };
}

function actionResponse(success = true): BotResponse {
  return {
    type: "action_result",
    text: "Action completed",
    actionResult: {
      action: "issue_create",
      success,
      message: success ? "Created ENG-123" : "Failed",
    },
  };
}

const ALL_PLATFORMS: BotPlatform[] = [
  "SLACK",
  "TEAMS",
  "DISCORD",
  "TELEGRAM",
  "WHATSAPP",
];

describe("formatForPlatform", () => {
  describe("slack", () => {
    it("renders search results with slack link syntax", () => {
      const out = formatForPlatform("SLACK", searchResponse());
      expect(out).toContain("<https://x.co/1|Deploy Guide>");
      expect(out).toContain("*Search: deploy*");
      expect(out).toContain("How to deploy...");
    });

    it("renders answer with italic sources", () => {
      const out = formatForPlatform("SLACK", answerResponse());
      expect(out).toContain("_Sources:");
      expect(out).toContain("<https://x.co/1|Deploy Guide>");
    });
  });

  describe("teams", () => {
    it("renders search results with markdown link syntax", () => {
      const out = formatForPlatform("TEAMS", searchResponse());
      expect(out).toContain("[Deploy Guide](https://x.co/1)");
      expect(out).toContain("**Search: deploy**");
    });

    it("renders answer with markdown sources", () => {
      const out = formatForPlatform("TEAMS", answerResponse());
      expect(out).toContain("[Deploy Guide](https://x.co/1)");
    });
  });

  describe("discord", () => {
    it("uses markdown syntax same as teams", () => {
      const out = formatForPlatform("DISCORD", searchResponse());
      expect(out).toContain("[Deploy Guide](https://x.co/1)");
      expect(out).toContain("**Search: deploy**");
    });
  });

  describe("telegram", () => {
    it("escapes markdownv2 special characters", () => {
      const out = formatForPlatform("TELEGRAM", {
        type: "text",
        text: "Hello 1.0! Check (this) out.",
      });
      expect(out).toContain("\\.");
      expect(out).toContain("\\!");
      expect(out).toContain("\\(");
      expect(out).toContain("\\)");
    });

    it("renders search with telegram-safe links", () => {
      const out = formatForPlatform("TELEGRAM", searchResponse());
      expect(out).toContain("[Deploy Guide](https://x.co/1)");
    });
  });

  describe("whatsapp", () => {
    it("renders without link syntax", () => {
      const out = formatForPlatform("WHATSAPP", searchResponse());
      expect(out).not.toContain("https://x.co/1|");
      expect(out).not.toContain("[Deploy Guide]");
      expect(out).toContain("Deploy Guide");
    });

    it("uses bold with asterisks", () => {
      const out = formatForPlatform("WHATSAPP", searchResponse());
      expect(out).toContain("*Search: deploy*");
    });
  });

  describe("expert list", () => {
    it("renders expert name and doc count across platforms", () => {
      for (const platform of ALL_PLATFORMS) {
        const out = formatForPlatform(platform, expertResponse());
        expect(out).toContain("Alice");
        expect(out).toContain("42 docs");
      }
    });

    it("renders email for non-telegram platforms", () => {
      for (const platform of [
        "SLACK",
        "TEAMS",
        "DISCORD",
        "WHATSAPP",
      ] as BotPlatform[]) {
        const out = formatForPlatform(platform, expertResponse());
        expect(out).toContain("alice@co.com");
      }
    });
  });

  describe("action result", () => {
    it("renders success icon", () => {
      const out = formatForPlatform("SLACK", actionResponse(true));
      expect(out).toContain("[+]");
      expect(out).toContain("issue_create");
    });

    it("renders failure icon", () => {
      const out = formatForPlatform("SLACK", actionResponse(false));
      expect(out).toContain("[x]");
    });
  });

  describe("error", () => {
    it("prefixes with Error across platforms", () => {
      const err: BotResponse = { type: "error", text: "Something broke" };
      for (const platform of ALL_PLATFORMS) {
        const out = formatForPlatform(platform, err);
        expect(out).toContain("Error");
        expect(out).toContain("Something broke");
      }
    });
  });

  describe("truncation", () => {
    it("truncates to whatsapp limit", () => {
      const long = "a".repeat(5000);
      const out = formatForPlatform("WHATSAPP", { type: "text", text: long });
      expect(out.length).toBeLessThanOrEqual(4096);
      expect(out).toEndWith("...");
    });

    it("does not truncate within slack limit", () => {
      const out = formatForPlatform("SLACK", { type: "text", text: "short" });
      expect(out).toBe("short");
    });
  });

  describe("platform parity", () => {
    it("all platforms render all response types without error", () => {
      const responses = [
        searchResponse(),
        answerResponse(),
        expertResponse(),
        actionResponse(),
        { type: "error" as const, text: "fail" },
        { type: "text" as const, text: "hello" },
      ];

      for (const platform of ALL_PLATFORMS) {
        for (const response of responses) {
          const out = formatForPlatform(platform, response);
          expect(out.length).toBeGreaterThan(0);
        }
      }
    });
  });
});

describe("escapeMarkdownV2", () => {
  it("escapes all special characters", () => {
    const result = escapeMarkdownV2("Hello_world *bold* [link](url) 1.0!");
    expect(result).toBe(
      "Hello\\_world \\*bold\\* \\[link\\]\\(url\\) 1\\.0\\!"
    );
  });

  it("returns plain text unchanged", () => {
    expect(escapeMarkdownV2("hello world")).toBe("hello world");
  });
});
