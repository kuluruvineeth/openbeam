import { describe, expect, it } from "bun:test";
import { resolveTemplateText } from "../template-text";

describe("resolveTemplateText", () => {
  it("replaces placeholders and normalizes singular grammar", () => {
    const text = resolveTemplateText(
      "{agentName} finished ({steps} steps, {tokensUsed} tokens)",
      {
        steps: 1,
        tokensUsed: 1,
      },
      "Agent A"
    );

    expect(text).toBe("Agent A finished (1 step, 1 token)");
  });

  it("removes unresolved placeholders", () => {
    const text = resolveTemplateText(
      "Budget set to {budget} by {agentName}",
      {}
    );
    expect(text).toBe("Budget set to  by ");
  });
});
