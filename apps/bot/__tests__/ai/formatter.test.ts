import { describe, expect, it } from "bun:test";
import type { BotResponse } from "@openbeam/types/bot";
import { formatForPlatform } from "../../src/ai/formatter";

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

function actionResponse(): BotResponse {
  return {
    type: "action_result",
    text: "Action completed",
    actionResult: {
      action: "issue_create",
      success: true,
      message: "Created ENG-123",
    },
  };
}

function errorResponse(): BotResponse {
  return { type: "error", text: "Something went wrong" };
}

describe("formatForPlatform", () => {
  describe("search results", () => {
    it("renders numbered results with links", () => {
      const out = formatForPlatform("SLACK", searchResponse());
      expect(out).toContain("*Search: deploy*");
      expect(out).toContain("1. *<https://x.co/1|Deploy Guide>*");
      expect(out).toContain("2. *<https://x.co/2|CI Pipeline>*");
      expect(out).toContain("How to deploy...");
    });
  });

  describe("answer", () => {
    it("renders answer with sources", () => {
      const out = formatForPlatform("SLACK", answerResponse());
      expect(out).toContain("The deploy process uses GitHub Actions.");
      expect(out).toContain("Sources:");
      expect(out).toContain("<https://x.co/1|Deploy Guide>");
    });

    it("renders answer without sources when none provided", () => {
      const out = formatForPlatform("SLACK", {
        type: "answer",
        text: "Just an answer.",
      });
      expect(out).toBe("Just an answer.");
    });
  });

  describe("expert list", () => {
    it("renders expert names and expertise", () => {
      const out = formatForPlatform("SLACK", expertResponse());
      expect(out).toContain("*Experts: kubernetes*");
      expect(out).toContain("*Alice*");
      expect(out).toContain("alice@co.com");
      expect(out).toContain("kubernetes, docker");
      expect(out).toContain("42 docs");
    });
  });

  describe("action result", () => {
    it("renders success icon", () => {
      const out = formatForPlatform("SLACK", actionResponse());
      expect(out).toContain("[+]");
      expect(out).toContain("issue_create");
    });

    it("renders failure icon", () => {
      const r = actionResponse();
      r.actionResult = { action: "send", success: false, message: "Failed" };
      const out = formatForPlatform("SLACK", r);
      expect(out).toContain("[x]");
    });
  });

  describe("error", () => {
    it("prefixes with Error:", () => {
      const out = formatForPlatform("SLACK", errorResponse());
      expect(out).toBe("Error: Something went wrong");
    });
  });

  describe("truncation", () => {
    it("truncates to platform max length", () => {
      const longText = "a".repeat(5000);
      const out = formatForPlatform("WHATSAPP", {
        type: "text",
        text: longText,
      });
      expect(out.length).toBeLessThanOrEqual(4096);
      expect(out).toEndWith("...");
    });

    it("does not truncate within limit", () => {
      const out = formatForPlatform("SLACK", { type: "text", text: "short" });
      expect(out).toBe("short");
    });
  });

  describe("platform parity", () => {
    it("formats for all platforms without error", () => {
      const platforms = [
        "SLACK",
        "TEAMS",
        "DISCORD",
        "TELEGRAM",
        "WHATSAPP",
      ] as const;
      const responses = [
        searchResponse(),
        answerResponse(),
        expertResponse(),
        actionResponse(),
        errorResponse(),
      ];

      for (const platform of platforms) {
        for (const response of responses) {
          const out = formatForPlatform(platform, response);
          expect(out.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
