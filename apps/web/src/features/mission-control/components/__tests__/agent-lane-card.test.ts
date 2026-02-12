import { describe, expect, it } from "bun:test";
import { createMockAgent } from "../../__tests__/test-helpers";
import {
  buildAgentMetricTokens,
  formatAgentLastActivity,
} from "../../lib/agent-lane-metrics";

describe("buildAgentMetricTokens", () => {
  it("returns steps, token, and cost metrics in order", () => {
    const agent = createMockAgent({
      stepsCompleted: 3,
      tokensUsed: 2300,
      costCents: 245,
    });

    const metrics = buildAgentMetricTokens(agent, false);

    expect(metrics).toEqual(["3 steps", "2.3K tok", "$2.45"]);
  });

  it("omits steps when progress bar is already shown", () => {
    const agent = createMockAgent({
      stepsCompleted: 8,
      tokensUsed: 1200,
      costCents: 50,
    });

    const metrics = buildAgentMetricTokens(agent, true);

    expect(metrics).toEqual(["1.2K tok", "$0.50"]);
  });
});

describe("formatAgentLastActivity", () => {
  it("returns null when last activity is missing", () => {
    expect(formatAgentLastActivity(undefined, 1_700_000_000_000)).toBeNull();
  });

  it("returns a contextual timestamp for known activity", () => {
    const now = 1_700_000_000_000;
    const value = formatAgentLastActivity(now - 30_000, now);

    expect(value).toBe("just now");
  });
});
