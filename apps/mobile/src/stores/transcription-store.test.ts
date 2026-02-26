import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(storage.get(key) ?? null)),
    setItem: vi.fn((key: string, val: string) => {
      storage.set(key, val);
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
      return Promise.resolve();
    }),
  },
}));

import { useTranscriptionStore } from "./transcription-store";

function getState() {
  return useTranscriptionStore.getState();
}

describe("transcription-store", () => {
  beforeEach(() => {
    useTranscriptionStore.setState({ transcriptions: [] });
  });

  it("starts empty", () => {
    expect(getState().transcriptions).toHaveLength(0);
  });

  it("adds a transcription", () => {
    const entry = getState().addTranscription({
      text: "Hello world",
      durationMs: 3000,
      language: "en",
    });
    // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
    expect(entry.id).toMatch(/^tx_/);
    expect(entry.text).toBe("Hello world");
    expect(entry.createdAt).toBeTruthy();
    expect(getState().transcriptions).toHaveLength(1);
  });

  it("prepends new transcriptions", () => {
    getState().addTranscription({
      text: "First",
      durationMs: 1000,
      language: "en",
    });
    const second = getState().addTranscription({
      text: "Second",
      durationMs: 2000,
      language: "en",
    });
    expect(getState().transcriptions[0].id).toBe(second.id);
  });

  it("caps at 200 transcriptions", () => {
    for (let i = 0; i < 210; i++) {
      getState().addTranscription({
        text: `Entry ${i}`,
        durationMs: 100,
        language: "en",
      });
    }
    expect(getState().transcriptions).toHaveLength(200);
    expect(getState().transcriptions[0].text).toBe("Entry 209");
  });

  it("deletes a transcription by id", () => {
    const entry = getState().addTranscription({
      text: "Delete me",
      durationMs: 500,
      language: "en",
    });
    getState().deleteTranscription(entry.id);
    expect(getState().transcriptions).toHaveLength(0);
  });

  it("clears all transcriptions", () => {
    getState().addTranscription({
      text: "One",
      durationMs: 100,
      language: "en",
    });
    getState().addTranscription({
      text: "Two",
      durationMs: 200,
      language: "en",
    });
    getState().clearAll();
    expect(getState().transcriptions).toHaveLength(0);
  });

  it("generates unique transcription ids", () => {
    const ids = Array.from(
      { length: 20 },
      (_, i) =>
        getState().addTranscription({
          text: `t${i}`,
          durationMs: 100,
          language: "en",
        }).id
    );
    expect(new Set(ids).size).toBe(20);
  });
});
