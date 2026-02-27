import { describe, expect, it } from "bun:test";
import { browserCloseTool } from "../close";
import { browserEvaluateTool } from "../evaluate";
import {
  browserClickTool,
  browserSelectTool,
  browserTypeTool,
} from "../interact";
import { browserLaunchTool } from "../launch";
import { browserNavigateTool } from "../navigate";
import { browserScrapeTool } from "../scrape";
import { browserScreenshotTool } from "../screenshot";
import { browserSnapshotTool } from "../snapshot";

const ALL_TOOLS = [
  { tool: browserLaunchTool, name: "browser_launch" },
  { tool: browserNavigateTool, name: "browser_navigate" },
  { tool: browserScreenshotTool, name: "browser_screenshot" },
  { tool: browserSnapshotTool, name: "browser_snapshot" },
  { tool: browserClickTool, name: "browser_click" },
  { tool: browserTypeTool, name: "browser_type" },
  { tool: browserSelectTool, name: "browser_select" },
  { tool: browserEvaluateTool, name: "browser_evaluate" },
  { tool: browserScrapeTool, name: "browser_scrape" },
  { tool: browserCloseTool, name: "browser_close" },
];

describe("browser tool metadata", () => {
  for (const { tool, name } of ALL_TOOLS) {
    describe(name, () => {
      it("has correct name", () => {
        expect(tool.metadata.name).toBe(name);
      });

      it("uses browser category", () => {
        expect(tool.metadata.category).toBe("browser");
      });

      it("has a description", () => {
        expect(tool.metadata.description.length).toBeGreaterThan(10);
      });

      it("has a coreTool", () => {
        expect(tool.coreTool).toBeDefined();
      });

      it("has a register function", () => {
        expect(typeof tool.register).toBe("function");
      });

      it("has an execute function", () => {
        expect(typeof tool.execute).toBe("function");
      });

      it("is deferred-loading enabled", () => {
        expect(tool.metadata.deferLoading).toBe(true);
      });
    });
  }
});

describe("browser tool risk profiles", () => {
  it("browser_launch has medium stakes", () => {
    expect(browserLaunchTool.metadata.riskProfile?.stakes).toBe("medium");
  });

  it("browser_evaluate has high stakes", () => {
    expect(browserEvaluateTool.metadata.riskProfile?.stakes).toBe("high");
  });

  it("browser_evaluate is irreversible", () => {
    expect(browserEvaluateTool.metadata.riskProfile?.reversibility).toBe(
      "irreversible"
    );
  });

  it("browser_click has medium stakes", () => {
    expect(browserClickTool.metadata.riskProfile?.stakes).toBe("medium");
  });

  it("browser_type has medium stakes", () => {
    expect(browserTypeTool.metadata.riskProfile?.stakes).toBe("medium");
  });

  it("read-only tools have low stakes", () => {
    const readOnlyTools = [
      browserNavigateTool,
      browserScreenshotTool,
      browserSnapshotTool,
      browserScrapeTool,
      browserCloseTool,
    ];
    for (const tool of readOnlyTools) {
      expect(tool.metadata.riskProfile?.stakes).toBe("low");
    }
  });
});

describe("browser tool search keywords", () => {
  it("browser_launch has relevant keywords", () => {
    const keywords = browserLaunchTool.metadata.searchKeywords ?? [];
    expect(keywords).toContain("browser");
    expect(keywords).toContain("launch");
    expect(keywords).toContain("chrome");
  });

  it("browser_snapshot has relevant keywords", () => {
    const keywords = browserSnapshotTool.metadata.searchKeywords ?? [];
    expect(keywords).toContain("aria");
    expect(keywords).toContain("accessibility");
    expect(keywords).toContain("snapshot");
  });

  it("browser_screenshot has relevant keywords", () => {
    const keywords = browserScreenshotTool.metadata.searchKeywords ?? [];
    expect(keywords).toContain("screenshot");
    expect(keywords).toContain("capture");
  });
});

describe("browser_close without session", () => {
  it("returns INVALID_STATE when no session exists", async () => {
    const mockCtx = {
      teamId: "team_123",
      userId: "user_456",
      services: {} as never,
    };
    const result = await browserCloseTool.execute({}, mockCtx);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_STATE");
  });
});

describe("browser_navigate without session", () => {
  it("throws when no session exists", async () => {
    const mockCtx = {
      teamId: "team_123",
      userId: "user_456",
      services: {} as never,
    };

    try {
      await browserNavigateTool.execute(
        { url: "https://example.com", waitUntil: "load", timeoutMs: 30_000 },
        mockCtx
      );
      expect(true).toBe(false);
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      if (error instanceof Error) {
        expect(error.message).toContain("No active browser session");
      }
    }
  });
});

describe("browser_click without session", () => {
  it("throws when no session exists", async () => {
    const mockCtx = {
      teamId: "team_123",
      userId: "user_456",
      services: {} as never,
    };

    try {
      await browserClickTool.execute(
        {
          selector: "#btn",
          button: "left",
          doubleClick: false,
          timeoutMs: 10_000,
        },
        mockCtx
      );
      expect(true).toBe(false);
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      if (error instanceof Error) {
        expect(error.message).toContain("No active browser session");
      }
    }
  });
});
