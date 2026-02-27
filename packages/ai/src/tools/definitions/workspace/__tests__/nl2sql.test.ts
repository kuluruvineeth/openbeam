import { describe, expect, it } from "bun:test";
import { workspaceNl2sqlTool } from "../nl2sql";

describe("workspaceNl2sqlTool", () => {
  describe("metadata", () => {
    it("has correct name", () => {
      expect(workspaceNl2sqlTool.metadata.name).toBe("workspace_nl2sql");
    });

    it("has data category", () => {
      expect(workspaceNl2sqlTool.metadata.category).toBe("data");
    });

    it("has deferLoading enabled", () => {
      expect(workspaceNl2sqlTool.metadata.deferLoading).toBe(true);
    });

    it("has low stakes", () => {
      expect(workspaceNl2sqlTool.metadata.riskProfile?.stakes).toBe("low");
    });

    it("has easy reversibility", () => {
      expect(workspaceNl2sqlTool.metadata.riskProfile?.reversibility).toBe(
        "easy"
      );
    });

    it("has auto approval pattern", () => {
      expect(workspaceNl2sqlTool.metadata.riskProfile?.approval).toBe("auto");
    });

    it("includes search keywords", () => {
      const keywords = workspaceNl2sqlTool.metadata.searchKeywords;
      expect(keywords).toContain("workspace");
      expect(keywords).toContain("nl2sql");
      expect(keywords).toContain("sql");
    });
  });

  describe("interface", () => {
    it("exposes coreTool", () => {
      expect(workspaceNl2sqlTool.coreTool).toBeDefined();
    });

    it("exposes register function", () => {
      expect(typeof workspaceNl2sqlTool.register).toBe("function");
    });

    it("exposes execute function", () => {
      expect(typeof workspaceNl2sqlTool.execute).toBe("function");
    });
  });

  describe("authorization", () => {
    it("fails without teamId", async () => {
      const result = await workspaceNl2sqlTool.execute(
        { question: "How many leads?" },
        {
          teamId: "",
          userId: "user_123",
          services: {} as never,
        }
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });
  });
});
