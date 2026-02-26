import { describe, expect, it } from "bun:test";
import { browserAutonomousTaskTool } from "../autonomous";

describe("browser_autonomous_task metadata", () => {
  it("has correct name", () => {
    expect(browserAutonomousTaskTool.metadata.name).toBe(
      "browser_autonomous_task"
    );
  });

  it("uses browser category", () => {
    expect(browserAutonomousTaskTool.metadata.category).toBe("browser");
  });

  it("has a description", () => {
    expect(
      browserAutonomousTaskTool.metadata.description.length
    ).toBeGreaterThan(10);
  });

  it("is deferred-loading enabled", () => {
    expect(browserAutonomousTaskTool.metadata.deferLoading).toBe(true);
  });

  it("has high stakes", () => {
    expect(browserAutonomousTaskTool.metadata.riskProfile?.stakes).toBe("high");
  });

  it("has hard reversibility", () => {
    expect(browserAutonomousTaskTool.metadata.riskProfile?.reversibility).toBe(
      "hard"
    );
  });

  it("has search keywords", () => {
    const keywords = browserAutonomousTaskTool.metadata.searchKeywords ?? [];
    expect(keywords).toContain("browser");
    expect(keywords).toContain("autonomous");
    expect(keywords).toContain("agent");
  });

  it("has a coreTool", () => {
    expect(browserAutonomousTaskTool.coreTool).toBeDefined();
  });

  it("has a register function", () => {
    expect(typeof browserAutonomousTaskTool.register).toBe("function");
  });

  it("has an execute function", () => {
    expect(typeof browserAutonomousTaskTool.execute).toBe("function");
  });
});

describe("browser_autonomous_task execution", () => {
  it("returns PROVIDER_ERROR when engine is unreachable", async () => {
    const originalUrl = process.env.ENGINE_CPU_URL;
    process.env.ENGINE_CPU_URL = "http://127.0.0.1:1";

    try {
      const mockCtx = {
        teamId: "team_123",
        userId: "user_456",
        services: {} as never,
      };

      const result = await browserAutonomousTaskTool.execute(
        { task: "test task", maxSteps: 5 },
        mockCtx
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("PROVIDER_ERROR");
    } finally {
      if (originalUrl) {
        process.env.ENGINE_CPU_URL = originalUrl;
      } else {
        process.env.ENGINE_CPU_URL = undefined;
      }
    }
  });
});
