import { describe, expect, test } from "bun:test";
import { classifyComplexity, selectModel } from "../complexity";

describe("classifyComplexity", () => {
  test("short queries are simple", () => {
    expect(classifyComplexity("hello")).toBe("simple");
    expect(classifyComplexity("what time")).toBe("simple");
    expect(classifyComplexity("deploy")).toBe("simple");
  });

  test("moderate length questions are moderate", () => {
    expect(
      classifyComplexity(
        "what are the deployment steps for our staging environment"
      )
    ).toBe("moderate");
  });

  test("analytics keywords trigger moderate or complex", () => {
    expect(classifyComplexity("analyze the deployment logs")).toBe("moderate");
    expect(classifyComplexity("compare slack and teams performance")).toBe(
      "moderate"
    );
  });

  test("long multi-question queries are complex", () => {
    const long =
      "Can you analyze the deployment pipeline, compare it with the previous version, and explain why the latency increased after the last release? Also check if there are any related incidents.";
    expect(classifyComplexity(long)).toBe("complex");
  });

  test("multi-step intent triggers complex", () => {
    expect(
      classifyComplexity("first search for the doc then summarize it")
    ).toBe("complex");
  });

  test("multiple question marks trigger complex", () => {
    expect(
      classifyComplexity("what is the deploy process? how do we rollback?")
    ).toBe("complex");
  });
});

describe("selectModel", () => {
  test("simple uses haiku", () => {
    const model = selectModel("simple");
    expect(model.modelId).toContain("haiku");
  });

  test("moderate uses sonnet", () => {
    const model = selectModel("moderate");
    expect(model.modelId).toContain("sonnet");
  });

  test("complex uses sonnet", () => {
    const model = selectModel("complex");
    expect(model.modelId).toContain("sonnet");
  });
});
