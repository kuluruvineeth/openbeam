import { describe, expect, it } from "bun:test";
import { MockSLM } from "../mock-slm";

describe("MockSLM", () => {
  it("returns default response", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    const result = await slm.generate("any prompt");
    expect(result.text).toBe("This is a mock response.");
  });

  it("uses custom default response", async () => {
    const slm = new MockSLM({
      defaultResponse: "custom default",
      latencyMs: 0,
    });
    const result = await slm.generate("any prompt");
    expect(result.text).toBe("custom default");
  });

  it("returns custom model ID", () => {
    const slm = new MockSLM({ modelId: "my-model" });
    expect(slm.modelId()).toBe("my-model");
    const slm2 = new MockSLM({ modelId: "test-model-v2" });
    expect(slm2.modelId()).toBe("test-model-v2");
  });

  it("uses default model ID", () => {
    const slm = new MockSLM();
    expect(slm.modelId()).toBe("mock-slm");
  });

  it("matches prompt-specific responses", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setResponse("weather", "It's sunny today.");
    slm.setResponse("time", "It's 3 PM.");

    const weatherResult = await slm.generate("What's the weather?");
    expect(weatherResult.text).toBe("It's sunny today.");

    const timeResult = await slm.generate("What time is it?");
    expect(timeResult.text).toBe("It's 3 PM.");
  });

  it("falls back to default when no match found", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setResponse("specific", "matched");

    const result = await slm.generate("unrelated prompt");
    expect(result.text).toBe("This is a mock response.");
  });

  it("reports availability", async () => {
    const slm = new MockSLM();
    expect(await slm.isAvailable()).toBe(true);

    slm.setAvailable(false);
    expect(await slm.isAvailable()).toBe(false);
  });

  it("throws when unavailable", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    slm.setAvailable(false);

    await expect(slm.generate("test")).rejects.toThrow("Model is not available");
  });

  it("estimates token count from text", async () => {
    const slm = new MockSLM({
      defaultResponse: "one two three four",
      latencyMs: 0,
    });
    const result = await slm.generate("test");
    expect(result.tokensUsed).toBeGreaterThan(0);
    expect(result.tokensUsed).toBe(Math.ceil(4 / 0.75));
  });

  it("reports latency", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    const result = await slm.generate("test");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("is not truncated by default", async () => {
    const slm = new MockSLM({ latencyMs: 0 });
    const result = await slm.generate("test");
    expect(result.truncated).toBe(false);
  });
});
