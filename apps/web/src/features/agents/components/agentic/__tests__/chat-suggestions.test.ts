import { describe, expect, it } from "bun:test";
import { buildSuggestions } from "../chat-suggestions";

describe("buildSuggestions", () => {
  it("returns fallback suggestions when connectors is null", () => {
    const result = buildSuggestions(null);
    expect(result.length).toBe(3);
    expect(result[0].label).toBe("Create a workflow");
  });

  it("returns fallback suggestions when connectors is undefined", () => {
    const result = buildSuggestions(undefined);
    expect(result.length).toBe(3);
  });

  it("returns fallback suggestions for empty array", () => {
    const result = buildSuggestions([]);
    expect(result.length).toBe(3);
    expect(result[0].label).toBe("Create a workflow");
  });

  it("returns dynamic suggestion for known connector", () => {
    const result = buildSuggestions([{ app: "slack" }]);
    expect(result.length).toBe(1);
    expect(result[0].label).toBe("Monitor Slack channels");
  });

  it("returns multiple suggestions for multiple connectors", () => {
    const result = buildSuggestions([{ app: "slack" }, { app: "gmail" }]);
    expect(result.length).toBe(2);
    const labels = result.map((s) => s.label);
    expect(labels).toContain("Monitor Slack channels");
    expect(labels).toContain("Process emails");
  });

  it("returns fallback for unknown connector types", () => {
    const result = buildSuggestions([{ app: "unknown_service" }]);
    expect(result.length).toBe(3);
    expect(result[0].label).toBe("Create a workflow");
  });

  it("caps at 4 suggestions", () => {
    const connectors = [
      { app: "slack" },
      { app: "gmail" },
      { app: "google_drive" },
      { app: "notion" },
      { app: "linear" },
      { app: "github" },
    ];
    const result = buildSuggestions(connectors);
    expect(result.length).toBeLessThanOrEqual(4);
  });

  it("matches connector types case-insensitively", () => {
    const result = buildSuggestions([{ app: "Slack" }]);
    expect(result.length).toBe(1);
    expect(result[0].label).toBe("Monitor Slack channels");
  });

  it("returns only matching suggestions for mixed known/unknown", () => {
    const result = buildSuggestions([
      { app: "slack" },
      { app: "unknown_app" },
      { app: "gmail" },
    ]);
    expect(result.length).toBe(2);
    const labels = result.map((s) => s.label);
    expect(labels).toContain("Monitor Slack channels");
    expect(labels).toContain("Process emails");
  });

  it("each suggestion has icon, label, and prompt", () => {
    const result = buildSuggestions([{ app: "slack" }]);
    for (const suggestion of result) {
      expect(suggestion.icon).toBeDefined();
      expect(suggestion.label).toBeTruthy();
      expect(suggestion.prompt).toBeTruthy();
    }
  });

  it("deduplicates connectors of the same type", () => {
    const result = buildSuggestions([{ app: "slack" }, { app: "slack" }]);
    expect(result.length).toBe(1);
  });
});
