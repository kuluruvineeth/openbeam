import { describe, expect, it } from "bun:test";
import { BROWSER_AGENT_PROMPT, browserAgentConfig } from "../index";

describe("browser agent config", () => {
  it("has correct name", () => {
    expect(browserAgentConfig.name).toBe("browser");
  });

  it("has llm type", () => {
    expect(browserAgentConfig.type).toBe("llm");
  });

  it("has a description", () => {
    expect(browserAgentConfig.description).toBeDefined();
    expect(browserAgentConfig.description?.length).toBeGreaterThan(10);
  });

  it("includes all 11 browser tools", () => {
    const expectedTools = [
      "browser_launch",
      "browser_navigate",
      "browser_screenshot",
      "browser_snapshot",
      "browser_click",
      "browser_type",
      "browser_select",
      "browser_evaluate",
      "browser_scrape",
      "browser_close",
      "browser_autonomous_task",
    ];

    for (const tool of expectedTools) {
      expect(browserAgentConfig.tools).toContain(tool);
    }
    expect(browserAgentConfig.tools).toHaveLength(11);
  });

  it("has low temperature for deterministic behavior", () => {
    expect(browserAgentConfig.model?.temperature).toBeLessThanOrEqual(0.3);
  });

  it("has adequate maxSteps", () => {
    expect(browserAgentConfig.maxSteps).toBeGreaterThanOrEqual(15);
    expect(browserAgentConfig.maxSteps).toBeLessThanOrEqual(30);
  });
});

describe("browser agent prompt", () => {
  it("contains role definition", () => {
    expect(BROWSER_AGENT_PROMPT).toContain("<role>");
  });

  it("describes deterministic mode", () => {
    expect(BROWSER_AGENT_PROMPT).toContain("DETERMINISTIC MODE");
  });

  it("describes autonomous mode", () => {
    expect(BROWSER_AGENT_PROMPT).toContain("AUTONOMOUS MODE");
  });

  it("references browser_autonomous_task tool", () => {
    expect(BROWSER_AGENT_PROMPT).toContain("browser_autonomous_task");
  });

  it("includes safety guidelines", () => {
    expect(BROWSER_AGENT_PROMPT).toContain("<guidelines>");
  });
});
