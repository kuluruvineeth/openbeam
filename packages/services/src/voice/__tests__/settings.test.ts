import { describe, expect, it, mock } from "bun:test";

mock.module("@openbeam/db", () => ({
  findVoiceSettings: mock(() => Promise.resolve(null)),
  upsertVoiceSettings: mock(() => Promise.resolve({})),
}));

const { getSettings } = await import("../settings");
const { findVoiceSettings } = await import("@openbeam/db");

describe("getSettings", () => {
  it("returns defaults when no settings exist", async () => {
    (findVoiceSettings as ReturnType<typeof mock>).mockResolvedValueOnce(null);

    const result = await getSettings({} as never, "user-1");

    expect(result.engine).toBe("cloud");
    expect(result.model).toBe("base.en");
    expect(result.language).toBe("en");
    expect(result.formatting).toBe(true);
    expect(result.formatStyle).toBe("context-aware");
    expect(result.widgetPosition).toBe("bottom-center");
    expect(result.widgetOpacity).toBe(0.7);
    expect(result.autoHide).toBe(false);
  });

  it("returns stored settings when they exist", async () => {
    const stored = {
      id: "vs-1",
      userId: "user-1",
      engine: "local",
      model: "small.en",
      language: "en",
      formatting: false,
      formatStyle: "off",
      shortcuts: {},
      vocabulary: ["OpenBeam"],
      widgetPosition: "top-right",
      widgetOpacity: 0.5,
      autoHide: true,
      updatedAt: new Date(),
    };
    (findVoiceSettings as ReturnType<typeof mock>).mockResolvedValueOnce(
      stored
    );

    const result = await getSettings({} as never, "user-1");

    expect(result.engine).toBe("local");
    expect(result.model).toBe("small.en");
    expect(result.autoHide).toBe(true);
  });
});
