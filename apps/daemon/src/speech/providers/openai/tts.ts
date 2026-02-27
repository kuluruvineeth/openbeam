import type { Readable } from "node:stream";
import OpenAI from "openai";
import type pino from "pino";
import type {
  SpeechStreamResult,
  TextToSpeechProvider,
} from "../../speech-provider.js";

export type { SpeechStreamResult };

export interface TTSConfig {
  apiKey: string;
  model?: "tts-1" | "tts-1-hd";
  voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  responseFormat?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
}

export class OpenAITTS implements TextToSpeechProvider {
  private readonly openaiClient: OpenAI;
  private readonly config: TTSConfig;
  private readonly logger: pino.Logger;

  constructor(ttsConfig: TTSConfig, parentLogger: pino.Logger) {
    this.config = {
      model: "tts-1",
      voice: "alloy",
      responseFormat: "pcm",
      ...ttsConfig,
    };
    this.logger = parentLogger.child({
      module: "agent",
      provider: "openai",
      component: "tts",
    });
    this.openaiClient = new OpenAI({
      apiKey: ttsConfig.apiKey,
    });

    this.logger.info(
      {
        voice: this.config.voice,
        model: this.config.model,
        format: this.config.responseFormat,
      },
      "TTS (OpenAI) initialized"
    );
  }

  // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
  public getConfig(): TTSConfig {
    return this.config;
  }

  // biome-ignore lint/style/useConsistentMemberAccessibility: class member accessibility
  public async synthesizeSpeech(text: string): Promise<SpeechStreamResult> {
    if (!text || text.trim().length === 0) {
      throw new Error("Cannot synthesize empty text");
    }

    const startTime = Date.now();

    try {
      this.logger.debug(
        { textLength: text.length, preview: text.substring(0, 50) },
        "Synthesizing speech"
      );

      const response = await this.openaiClient.audio.speech.create({
        // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
        model: this.config.model!,
        // biome-ignore lint/style/noNonNullAssertion: value guaranteed to be set
        voice: this.config.voice!,
        input: text,
        response_format: this.config.responseFormat as
          | "mp3"
          | "opus"
          | "aac"
          | "flac"
          | "wav"
          | "pcm",
      });

      const audioStream = response.body as unknown as Readable;

      const duration = Date.now() - startTime;
      this.logger.debug({ duration }, "Speech synthesis stream ready");

      return {
        stream: audioStream,
        format: this.config.responseFormat || "mp3",
      };
      // biome-ignore lint/suspicious/noExplicitAny: daemon type interop
    } catch (error: any) {
      this.logger.error({ err: error }, "Speech synthesis error");
      throw new Error(`TTS synthesis failed: ${error.message}`);
    }
  }
}
