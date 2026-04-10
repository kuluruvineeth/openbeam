import { describe, expect, it } from "bun:test";
import { collectAndFlush } from "../../src/streaming/text-collector";

const noop = Function.prototype as () => Promise<void>;

function* fakeStream(chunks: string[]) {
  for (const chunk of chunks) {
    yield { type: "text", content: chunk };
  }
  yield { type: "done", content: "" };
}

describe("collectAndFlush", () => {
  it("collects all text chunks into fullText", async () => {
    const result = await collectAndFlush(
      fakeStream(["Hello ", "world"]),
      noop,
      {
        flushIntervalMs: 0,
        minCharsToFlush: 0,
      }
    );
    expect(result.fullText).toBe("Hello world");
    expect(result.chunkCount).toBe(2);
  });

  it("calls onFlush with accumulated text", async () => {
    const flushed: string[] = [];
    const pushFlushed = (text: string) => {
      flushed.push(text);
      return Promise.resolve();
    };
    await collectAndFlush(fakeStream(["Hello ", "world"]), pushFlushed, {
      flushIntervalMs: 0,
      minCharsToFlush: 0,
    });
    expect(flushed.at(-1)).toBe("Hello world");
  });

  it("respects minCharsToFlush", async () => {
    const flushed: string[] = [];
    const pushFlushed = (text: string) => {
      flushed.push(text);
      return Promise.resolve();
    };
    await collectAndFlush(fakeStream(["Hi"]), pushFlushed, {
      flushIntervalMs: 0,
      minCharsToFlush: 100,
    });
    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toBe("Hi");
  });

  it("returns empty for no text chunks", async () => {
    function* empty() {
      yield { type: "done", content: "" };
    }
    const result = await collectAndFlush(empty(), noop, {
      flushIntervalMs: 0,
      minCharsToFlush: 0,
    });
    expect(result.fullText).toBe("");
    expect(result.chunkCount).toBe(0);
  });
});
