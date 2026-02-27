import { EventEmitter } from "node:events";
import pino from "pino";
import { describe, expect, it } from "vitest";
import type {
  SpeechToTextProvider,
  StreamingTranscriptionSession,
  TranscriptionResult,
} from "../speech/speech-provider.js";
import { STTManager } from "./stt-manager.js";

class FakeStt implements SpeechToTextProvider {
  // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
  public readonly id = "fake";
  // biome-ignore lint/style/noParameterProperties: TypeScript parameter properties
  constructor(private readonly result: TranscriptionResult) {}

  createSession(_params: {
    logger: any;
    language?: string;
    prompt?: string;
  }): StreamingTranscriptionSession {
    const emitter = new EventEmitter();
    const result = this.result;
    let segmentId = "seg-1";
    let previousSegmentId: string | null = null;

    return {
      requiredSampleRate: 24_000,
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      async connect() {},
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      appendPcm16() {},
      commit() {
        (emitter as any).emit("committed", { segmentId, previousSegmentId });
        (emitter as any).emit("transcript", {
          segmentId,
          transcript: result.text,
          isFinal: true,
          language: result.language,
          logprobs: result.logprobs,
          avgLogprob: result.avgLogprob,
          isLowConfidence: result.isLowConfidence,
        });
        previousSegmentId = segmentId;
        segmentId = "seg-2";
      },
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      clear() {},
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      close() {},
      on(event: any, handler: any) {
        emitter.on(event, handler);
        return;
      },
    };
  }
}

class SequencedFakeStt implements SpeechToTextProvider {
  // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
  public readonly id = "fake-sequenced";
  // biome-ignore lint/style/noParameterProperties: TypeScript parameter properties
  constructor(private readonly transcripts: string[]) {}

  createSession(_params: {
    logger: any;
    language?: string;
    prompt?: string;
  }): StreamingTranscriptionSession {
    const emitter = new EventEmitter();
    const transcripts = this.transcripts;
    let segmentId = "seg-1";
    let previousSegmentId: string | null = null;
    let idx = 0;

    return {
      requiredSampleRate: 24_000,
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      async connect() {},
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      appendPcm16() {},
      commit() {
        const transcript = transcripts[idx] ?? "";
        idx += 1;
        (emitter as any).emit("committed", { segmentId, previousSegmentId });
        (emitter as any).emit("transcript", {
          segmentId,
          transcript,
          isFinal: true,
          language: "en",
          isLowConfidence: transcript.length === 0,
        });
        previousSegmentId = segmentId;
        segmentId = `seg-${idx + 1}`;
      },
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      clear() {},
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      close() {},
      on(event: any, handler: any) {
        emitter.on(event, handler);
        return;
      },
    };
  }
}

describe("STTManager", () => {
  it("returns empty text for low-confidence transcriptions", async () => {
    const manager = new STTManager(
      "s1",
      pino({ level: "silent" }),
      new FakeStt({ text: "um", isLowConfidence: true, avgLogprob: -10 })
    );

    const result = await manager.transcribe(
      Buffer.alloc(2),
      "audio/pcm;rate=24000",
      {
        label: "t",
      }
    );
    expect(result.text).toBe("");
    expect(result.isLowConfidence).toBe(true);
    expect(result.byteLength).toBe(2);
  });

  it("passes through normal transcriptions", async () => {
    const manager = new STTManager(
      "s1",
      pino({ level: "silent" }),
      new FakeStt({
        text: "hello world",
        language: "en",
        isLowConfidence: false,
      })
    );

    const result = await manager.transcribe(
      Buffer.alloc(4),
      "audio/pcm;rate=24000"
    );
    expect(result.text).toBe("hello world");
    expect(result.language).toBe("en");
    expect(result.byteLength).toBe(4);
  });

  it("uses streaming segmentation for batch transcription and concatenates segment finals", async () => {
    const original = process.env.OPENPLANE_STT_BATCH_COMMIT_EVERY_SECONDS;
    process.env.OPENPLANE_STT_BATCH_COMMIT_EVERY_SECONDS = "1";

    try {
      const manager = new STTManager(
        "s1",
        pino({ level: "silent" }),
        new SequencedFakeStt(["alpha", "beta", "gamma"])
      );

      const threeSecondsPcm = Buffer.alloc(24_000 * 2 * 3);
      const result = await manager.transcribe(
        threeSecondsPcm,
        "audio/pcm;rate=24000"
      );

      expect(result.text).toBe("alpha beta gamma");
      expect(result.language).toBe("en");
      expect(result.byteLength).toBe(threeSecondsPcm.length);
    } finally {
      if (original === undefined) {
        process.env.OPENPLANE_STT_BATCH_COMMIT_EVERY_SECONDS = undefined;
      } else {
        process.env.OPENPLANE_STT_BATCH_COMMIT_EVERY_SECONDS = original;
      }
    }
  });
});
