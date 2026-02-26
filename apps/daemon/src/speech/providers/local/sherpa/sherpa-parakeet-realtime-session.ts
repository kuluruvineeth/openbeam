import { EventEmitter } from "node:events";
import { v4 as uuidv4 } from "uuid";
import { pcm16lePeakAbs, pcm16leToFloat32 } from "../../../audio.js";
import type { StreamingTranscriptionSession } from "../../../speech-provider.js";
import type { SherpaOfflineRecognizerEngine } from "./sherpa-offline-recognizer.js";

export class SherpaParakeetRealtimeTranscriptionSession
  extends EventEmitter
  implements StreamingTranscriptionSession
{
  private readonly engine: SherpaOfflineRecognizerEngine;
  private connected = false;

  // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
  public readonly requiredSampleRate: number;
  private currentSegmentId: string | null = null;
  private previousSegmentId: string | null = null;
  private lastPartialText = "";

  private pcm16: Buffer = Buffer.alloc(0);
  private lastDecodeAt = 0;
  private decoding = false;
  private pendingDecode = false;
  private readonly minDecodeIntervalMs: number;

  constructor(params: {
    engine: SherpaOfflineRecognizerEngine;
    minDecodeIntervalMs?: number;
  }) {
    super();
    this.engine = params.engine;
    this.requiredSampleRate = this.engine.sampleRate;
    this.minDecodeIntervalMs = params.minDecodeIntervalMs ?? 350;
  }

  // biome-ignore lint/suspicious/useAwait: async signature required by interface
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    this.currentSegmentId = uuidv4();
    this.connected = true;
  }

  appendPcm16(chunk: Buffer): void {
    if (!(this.connected && this.currentSegmentId)) {
      this.emit("error", new Error("Parakeet realtime session not connected"));
      return;
    }

    try {
      this.pcm16 =
        this.pcm16.length === 0 ? chunk : Buffer.concat([this.pcm16, chunk]);
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void this.maybeDecode(false);
    } catch (err) {
      this.emit("error", err instanceof Error ? err : new Error(String(err)));
    }
  }

  commit(): void {
    if (!(this.connected && this.currentSegmentId)) {
      this.emit("error", new Error("Parakeet realtime session not connected"));
      return;
    }

    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void (async () => {
      try {
        await this.maybeDecode(true);
        const finalText = this.lastPartialText;
        // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
        const segmentId = this.currentSegmentId!;
        const previousSegmentId = this.previousSegmentId;

        this.emit("committed", { segmentId, previousSegmentId });
        this.emit("transcript", {
          segmentId,
          transcript: finalText,
          isFinal: true,
        });

        this.previousSegmentId = segmentId;
        this.currentSegmentId = uuidv4();
        this.lastPartialText = "";
        this.pcm16 = Buffer.alloc(0);
      } catch (err) {
        this.emit("error", err instanceof Error ? err : new Error(String(err)));
      }
    })();
  }

  clear(): void {
    if (!this.connected) {
      return;
    }
    this.pcm16 = Buffer.alloc(0);
    this.currentSegmentId = uuidv4();
    this.lastPartialText = "";
  }

  close(): void {
    this.connected = false;
    this.currentSegmentId = null;
    this.pcm16 = Buffer.alloc(0);
  }

  private async maybeDecode(force: boolean): Promise<void> {
    if (!(this.connected && this.currentSegmentId)) {
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastDecodeAt < this.minDecodeIntervalMs) {
      return;
    }

    if (this.decoding) {
      this.pendingDecode = true;
      return;
    }

    this.decoding = true;
    try {
      const text = await this.decodeNow();
      this.lastDecodeAt = Date.now();
      if (text !== this.lastPartialText) {
        this.lastPartialText = text;
        this.emit("transcript", {
          segmentId: this.currentSegmentId,
          transcript: text,
          isFinal: false,
        });
      }
    } finally {
      this.decoding = false;
      if (this.pendingDecode) {
        this.pendingDecode = false;
        await this.maybeDecode(true);
      }
    }
  }

  // biome-ignore lint/suspicious/useAwait: async signature required by interface
  private async decodeNow(): Promise<string> {
    if (this.pcm16.length === 0) {
      return "";
    }

    const peak = pcm16lePeakAbs(this.pcm16);
    const peakFloat = peak / 32_768.0;
    const targetPeak = 0.6;
    const maxGain = 50;
    const gain =
      peakFloat > 0 && peakFloat < targetPeak
        ? Math.min(maxGain, targetPeak / peakFloat)
        : 1;

    const stream = this.engine.createStream();
    try {
      const floatSamples = pcm16leToFloat32(this.pcm16, gain);
      this.engine.acceptWaveform(stream, this.engine.sampleRate, floatSamples);
      this.engine.recognizer.decode(stream);
      const result = this.engine.recognizer.getResult(stream);
      return String(result?.text ?? result ?? "").trim();
    } finally {
      try {
        stream.free?.();
      } catch {
        // ignore
      }
    }
  }
}
