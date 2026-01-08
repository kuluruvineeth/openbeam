import { describe, expect, it } from "bun:test";
import {
  buildConversationSummarySection,
  buildDynamicSystemPrompt,
  buildSessionContextSection,
  buildSkillNamesSection,
  buildToolNamesSection,
  createPromptBuilder,
  type SessionContextData,
} from "../dynamic";

describe("Dynamic Prompt Building", () => {
  describe("buildToolNamesSection", () => {
    it("creates section with tool list", () => {
      const tools = ["search", "getDocument", "analyzeQuery"];
      const section = buildToolNamesSection(tools);

      expect(section.tag).toBe("available_tools");
      expect(section.content).toContain("- search");
      expect(section.content).toContain("- getDocument");
      expect(section.content).toContain("- analyzeQuery");
      expect(section.attributes?.count).toBe("3");
    });

    it("handles empty tool list", () => {
      const section = buildToolNamesSection([]);

      expect(section.tag).toBe("available_tools");
      expect(section.content).toContain("No tools are currently available");
    });

    it("includes instructions about getToolInfo", () => {
      const section = buildToolNamesSection(["search"]);

      expect(section.content).toContain("getToolInfo");
    });
  });

  describe("buildSkillNamesSection", () => {
    it("creates section with skill list", () => {
      const skills = ["code-review", "api-research", "connector"];
      const section = buildSkillNamesSection(skills);

      expect(section.tag).toBe("available_skills");
      expect(section.content).toContain("- code-review");
      expect(section.content).toContain("- api-research");
      expect(section.content).toContain("- connector");
      expect(section.attributes?.count).toBe("3");
    });

    it("handles empty skill list", () => {
      const section = buildSkillNamesSection([]);

      expect(section.tag).toBe("available_skills");
      expect(section.content).toContain("No skills are currently available");
    });
  });

  describe("buildSessionContextSection", () => {
    it("creates section with session data", () => {
      const session: SessionContextData = {
        sessionId: "sess_123",
        teamId: "team_abc",
        userId: "user_xyz",
        startedAt: Date.now(),
        turnCount: 5,
      };

      const section = buildSessionContextSection(session);

      expect(section.tag).toBe("session_context");
      expect(section.content).toContain("sess_123");
      expect(section.content).toContain("team_abc");
      expect(section.content).toContain("user_xyz");
      expect(section.content).toContain("Turn count: 5");
      expect(section.attributes?.turn).toBe("5");
    });

    it("includes active tools when provided", () => {
      const session: SessionContextData = {
        sessionId: "sess_123",
        teamId: "team_abc",
        userId: "user_xyz",
        startedAt: Date.now(),
        turnCount: 3,
        activeTools: ["search", "analyze"],
      };

      const section = buildSessionContextSection(session);

      expect(section.content).toContain("Active tools: search, analyze");
    });

    it("includes custom data when provided", () => {
      const session: SessionContextData = {
        sessionId: "sess_123",
        teamId: "team_abc",
        userId: "user_xyz",
        startedAt: Date.now(),
        turnCount: 1,
        customData: {
          project: "openplane",
          role: "developer",
        },
      };

      const section = buildSessionContextSection(session);

      expect(section.content).toContain("project: openplane");
      expect(section.content).toContain("role: developer");
    });
  });

  describe("buildConversationSummarySection", () => {
    it("creates section with summary", () => {
      const summary = "User asked about authentication and we discussed OAuth2";
      const section = buildConversationSummarySection(summary);

      expect(section.tag).toBe("conversation_summary");
      expect(section.content).toBe(summary);
    });
  });

  describe("buildDynamicSystemPrompt", () => {
    it("creates prompt with all sections", () => {
      const result = buildDynamicSystemPrompt({
        toolNames: ["search", "analyze"],
        skillNames: ["connector"],
        sessionContext: {
          sessionId: "sess_123",
          teamId: "team_abc",
          userId: "user_xyz",
          startedAt: Date.now(),
          turnCount: 2,
        },
        conversationSummary: "Previous discussion about APIs",
      });

      expect(result.content).toContain("<instructions>");
      expect(result.content).toContain("<available_tools");
      expect(result.content).toContain("<available_skills");
      expect(result.content).toContain("<session_context");
      expect(result.content).toContain("<conversation_summary>");
      expect(result.sections).toContain("instructions");
      expect(result.sections).toContain("available_tools");
      expect(result.sections).toContain("available_skills");
      expect(result.sections).toContain("session_context");
      expect(result.sections).toContain("conversation_summary");
      expect(result.tokenEstimate).toBeGreaterThan(0);
    });

    it("creates minimal prompt with just instructions", () => {
      const result = buildDynamicSystemPrompt({});

      expect(result.content).toContain("<instructions>");
      expect(result.sections).toEqual(["instructions"]);
    });

    it("includes custom sections", () => {
      const result = buildDynamicSystemPrompt({
        customSections: [
          { tag: "custom_rules", content: "Special rules for this task" },
        ],
      });

      expect(result.content).toContain("<custom_rules>");
      expect(result.content).toContain("Special rules for this task");
      expect(result.sections).toContain("custom_rules");
    });

    it("estimates tokens correctly", () => {
      const shortPrompt = buildDynamicSystemPrompt({});
      const longPrompt = buildDynamicSystemPrompt({
        toolNames: new Array(50).fill("tool"),
        skillNames: new Array(20).fill("skill"),
        conversationSummary: "A".repeat(1000),
      });

      expect(longPrompt.tokenEstimate).toBeGreaterThan(
        shortPrompt.tokenEstimate
      );
    });
  });

  describe("createPromptBuilder", () => {
    it("builds prompt fluently", () => {
      const prompt = createPromptBuilder()
        .withToolNames(["search", "getDocument"])
        .withSkillNames(["connector"])
        .withSessionContext({
          sessionId: "sess_123",
          teamId: "team_abc",
          userId: "user_xyz",
          startedAt: Date.now(),
          turnCount: 1,
        })
        .withConversationSummary("User is looking for documentation")
        .build();

      expect(prompt.sections).toHaveLength(5);
      expect(prompt.content).toContain("search");
      expect(prompt.content).toContain("connector");
      expect(prompt.content).toContain("sess_123");
      expect(prompt.content).toContain("documentation");
    });

    it("allows adding multiple custom sections", () => {
      const prompt = createPromptBuilder()
        .withCustomSection({ tag: "rules", content: "Rule 1" })
        .withCustomSection({ tag: "examples", content: "Example 1" })
        .build();

      expect(prompt.sections).toContain("rules");
      expect(prompt.sections).toContain("examples");
    });

    it("returns builder for chaining", () => {
      const builder = createPromptBuilder();

      expect(builder.withToolNames([])).toBe(builder);
      expect(builder.withSkillNames([])).toBe(builder);
      expect(
        builder.withSessionContext({
          sessionId: "s",
          teamId: "t",
          userId: "u",
          startedAt: 0,
          turnCount: 0,
        })
      ).toBe(builder);
      expect(builder.withConversationSummary("")).toBe(builder);
      expect(builder.withCustomSection({ tag: "t", content: "c" })).toBe(
        builder
      );
    });
  });
});
