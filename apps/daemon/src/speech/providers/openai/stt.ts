import { EventEmitter } from "node:events";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import OpenAI from "openai";
import type pino from "pino";
import { v4 } from "uuid";
import { inferAudioExtension } from "../../../agent/audio-utils.js";
import type {
  LogprobToken,
  SpeechToTextProvider,
  StreamingTranscriptionSession,
  TranscriptionResult,
} from "../../speech-provider.js";

export type { LogprobToken, TranscriptionResult };

export interface STTConfig {
  apiKey: string;
  model?:
    | "whisper-1"
    | "gpt-4o-transcribe"
    | "gpt-4o-mini-transcribe"
    | (string & {});
  confidenceThreshold?: number; // Default: -3.0
}

function isObject(value: unknown): value is { [key: string]: unknown } {
  return typeof value === "object" && value !== null;
}

function isLogprobToken(value: unknown): value is LogprobToken {
  if (!isObject(value)) {
    return false;
  }
  if (typeof value.token !== "string") {
    return false;
  }
  if (typeof value.logprob !== "number") {
    return false;
  }
  if (value.bytes === undefined) {
    return true;
  }
  return (
    Array.isArray(value.bytes) &&
    value.bytes.every((entry) => typeof entry === "number")
  );
}

function isLogprobTokenArray(value: unknown): value is LogprobToken[] {
  return Array.isArray(value) && value.every((entry) => isLogprobToken(entry));
}

export class OpenAISTT implements SpeechToTextProvider {
  private readonly openaiClient: OpenAI;
  private readonly config: STTConfig;
  private readonly logger: pino.Logger;
  // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
  public readonly id = "openai" as const;

  constructor(sttConfig: STTConfig, parentLogger: pino.Logger) {
    this.config = sttConfig;
    this.logger = parentLogger.child({
      module: "agent",
      provider: "openai",
      component: "stt",
    });
    this.openaiClient = new OpenAI({
      apiKey: sttConfig.apiKey,
    });
    this.logger.info(
      { model: sttConfig.model || "whisper-1" },
      "STT (OpenAI Whisper) initialized"
    );
  }

  // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
  public createSession(params: {
    logger: pino.Logger;
    language?: string;
    prompt?: string;
  }): StreamingTranscriptionSession {
    const emitter = new EventEmitter();
    const logger = params.logger.child({
      provider: "openai",
      component: "stt-session",
    });
    const requiredSampleRate = 24_000;

    let connected = false;
    let segmentId = v4();
    let previousSegmentId: string | null = null;
    let pcm16: Buffer = Buffer.alloc(0);
    const transcribeAudio = this.transcribeAudioInternal.bind(this);

    const convertPCMToWavBuffer = (pcmBuffer: Buffer): Buffer => {
      const headerSize = 44;
      const channels = 1;
      const bitsPerSample = 16;
      const sampleRate = requiredSampleRate;
      const wavBuffer = Buffer.alloc(headerSize + pcmBuffer.length);
      const byteRate = (sampleRate * channels * bitsPerSample) / 8;
      const blockAlign = (channels * bitsPerSample) / 8;

      wavBuffer.write("RIFF", 0);
      wavBuffer.writeUInt32LE(36 + pcmBuffer.length, 4);
      wavBuffer.write("WAVE", 8);
      wavBuffer.write("fmt ", 12);
      wavBuffer.writeUInt32LE(16, 16);
      wavBuffer.writeUInt16LE(1, 20);
      wavBuffer.writeUInt16LE(channels, 22);
      wavBuffer.writeUInt32LE(sampleRate, 24);
      wavBuffer.writeUInt32LE(byteRate, 28);
      wavBuffer.writeUInt16LE(blockAlign, 32);
      wavBuffer.writeUInt16LE(bitsPerSample, 34);
      wavBuffer.write("data", 36);
      wavBuffer.writeUInt32LE(pcmBuffer.length, 40);
      pcmBuffer.copy(wavBuffer, 44);

      return wavBuffer;
    };

    return {
      requiredSampleRate,
      // biome-ignore lint/suspicious/useAwait: async signature required by interface
      async connect() {
        connected = true;
      },
      appendPcm16(chunk: Buffer) {
        if (!connected) {
          // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
          (emitter as any).emit(
            "error",
            new Error("STT session not connected")
          );
          return;
        }
        pcm16 = pcm16.length === 0 ? chunk : Buffer.concat([pcm16, chunk]);
      },
      commit() {
        if (!connected) {
          // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
          (emitter as any).emit(
            "error",
            new Error("STT session not connected")
          );
          return;
        }

        const committedId = segmentId;
        const prev = previousSegmentId;
        // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
        (emitter as any).emit("committed", {
          segmentId: committedId,
          previousSegmentId: prev,
        });

        // biome-ignore lint/complexity/noVoid: fire-and-forget async call
        void (async () => {
          try {
            if (pcm16.length === 0) {
              // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
              (emitter as any).emit("transcript", {
                segmentId: committedId,
                transcript: "",
                isFinal: true,
                language: params.language,
                isLowConfidence: true,
              });
              return;
            }

            const wav = convertPCMToWavBuffer(pcm16);
            const result = await transcribeAudio(
              wav,
              "audio/wav",
              params.language ?? "en",
              logger
            );

            // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
            (emitter as any).emit("transcript", {
              segmentId: committedId,
              transcript: result.text,
              isFinal: true,
              language: result.language,
              logprobs: result.logprobs,
              avgLogprob: result.avgLogprob,
              isLowConfidence: result.isLowConfidence,
            });
          } catch (err) {
            // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
            (emitter as any).emit("error", err);
          } finally {
            previousSegmentId = committedId;
            segmentId = v4();
            pcm16 = Buffer.alloc(0);
          }
        })();
      },
      clear() {
        pcm16 = Buffer.alloc(0);
        segmentId = v4();
      },
      close() {
        connected = false;
        pcm16 = Buffer.alloc(0);
      },
      // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
      on(event: any, handler: any) {
        emitter.on(event, handler);
        return;
      },
    };
  }

  private async transcribeAudioInternal(
    audioBuffer: Buffer,
    format: string,
    language: string,
    logger: pino.Logger
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();
    let tempFilePath: string | null = null;

    try {
      const ext = inferAudioExtension(format);
      tempFilePath = join(tmpdir(), `audio-${v4()}.${ext}`);
      await writeFile(tempFilePath, audioBuffer);

      logger.debug(
        { tempFilePath, bytes: audioBuffer.length },
        "Transcribing audio file"
      );

      const modelToUse = this.config.model ?? "whisper-1";
      const supportsLogprobs =
        modelToUse === "gpt-4o-transcribe" ||
        modelToUse === "gpt-4o-mini-transcribe";
      const includeLogprobs: ["logprobs"] = ["logprobs"];

      const response = await this.openaiClient.audio.transcriptions.create({
        file: await import("node:fs").then((fs) =>
          // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
          fs.createReadStream(tempFilePath!)
        ),
        language,
        model: modelToUse,
        ...(supportsLogprobs ? { include: includeLogprobs } : {}),
        response_format: "json",
      });

      const duration = Date.now() - startTime;
      const confidenceThreshold = this.config.confidenceThreshold ?? -3.0;

      let avgLogprob: number | undefined;
      let isLowConfidence = false;
      const logprobs =
        supportsLogprobs &&
        isObject(response) &&
        isLogprobTokenArray(response.logprobs)
          ? response.logprobs
          : undefined;

      if (logprobs && logprobs.length > 0) {
        const totalLogprob = logprobs.reduce(
          (sum, token) => sum + token.logprob,
          0
        );
        avgLogprob = totalLogprob / logprobs.length;
        isLowConfidence = avgLogprob < confidenceThreshold;

        if (isLowConfidence) {
          logger.debug(
            {
              avgLogprob,
              threshold: confidenceThreshold,
              text: response.text,
              tokenLogprobs: logprobs
                .map((t) => `${t.token}:${t.logprob.toFixed(2)}`)
                .join(", "),
            },
            "Low confidence transcription detected"
          );
        }
      }

      logger.debug(
        { duration, text: response.text, avgLogprob },
        "Transcription complete"
      );

      return {
        text: response.text,
        duration,
        logprobs,
        avgLogprob,
        isLowConfidence,
        language:
          isObject(response) && typeof response.language === "string"
            ? response.language
            : undefined,
      };
      // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
    } catch (error: any) {
      logger.error({ err: error }, "Transcription error");
      throw new Error(`STT transcription failed: ${error.message}`);
    } finally {
      if (tempFilePath) {
        try {
          await unlink(tempFilePath);
        } catch (_cleanupError) {
          logger.warn({ tempFilePath }, "Failed to clean up temp file");
        }
      }
    }
  }
}
