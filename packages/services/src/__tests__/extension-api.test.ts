import { describe, expect, it } from "bun:test";
import {
  ExtensionServiceError,
  submitExtensionChatForTeam,
} from "../extension-api";

describe("extension api service", () => {
  it("returns extract proposal for read-only prompt", async () => {
    const result = await submitExtensionChatForTeam({
      teamId: "team-1",
      sessionId: "session-1",
      prompt: "Summarize this page",
      pageUrl: "https://example.com/docs",
    });

    expect(result.proposal.kind).toBe("extract");
    expect(result.proposal.requiresApproval).toBe(false);
    expect(result.proposal.summary).toContain("example.com");
  });

  it("returns high-risk fill proposal for form entry prompts", async () => {
    const result = await submitExtensionChatForTeam({
      teamId: "team-1",
      sessionId: "session-1",
      prompt: "Fill this form with my profile data",
      pageUrl: "https://example.com/form",
    });

    expect(result.proposal.kind).toBe("fill");
    expect(result.proposal.risk).toBe("high");
    expect(result.proposal.requiresApproval).toBe(true);
  });

  it("fails when host decision is blocked", () => {
    expect(() =>
      submitExtensionChatForTeam({
        teamId: "team-1",
        sessionId: "session-1",
        prompt: "Summarize this page",
        hostDecisionMode: "block",
      })
    ).toThrow(ExtensionServiceError);
  });

  it("fails when prompt is empty", () => {
    try {
      submitExtensionChatForTeam({
        teamId: "team-1",
        sessionId: "session-1",
        prompt: "   ",
      });
      throw new Error("Expected INVALID_PROMPT error");
    } catch (error) {
      expect(error).toBeInstanceOf(ExtensionServiceError);
      expect((error as ExtensionServiceError).code).toBe("INVALID_PROMPT");
    }
  });
});
