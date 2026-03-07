import { z } from "zod";

export const SpeechProviderIdSchema = z.enum(["openai", "local"]);
export type SpeechProviderId = z.infer<typeof SpeechProviderIdSchema>;

export const RequestedSpeechProviderSchema = z.object({
  provider: SpeechProviderIdSchema,
  explicit: z.boolean(),
  enabled: z.boolean().optional(),
});

export type RequestedSpeechProvider = z.infer<
  typeof RequestedSpeechProviderSchema
>;

export type RequestedSpeechProviders = {
  dictationStt: RequestedSpeechProvider;
  voiceStt: RequestedSpeechProvider;
  voiceTts: RequestedSpeechProvider;
};

export const OpenAiTtsVoiceSchema = z.enum([
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
]);

export type OpenAiTtsVoice = z.infer<typeof OpenAiTtsVoiceSchema>;

export const OpenAiTtsModelSchema = z.enum(["tts-1", "tts-1-hd"]);
export type OpenAiTtsModel = z.infer<typeof OpenAiTtsModelSchema>;

export type OpenAiSpeechProviderConfig = {
  apiKey?: string;
  stt?: {
    apiKey?: string;
    model?: string;
    confidenceThreshold?: number;
  };
  tts?: {
    apiKey?: string;
    voice?: OpenAiTtsVoice;
    model?: OpenAiTtsModel;
    responseFormat?: string;
  };
  realtimeTranscriptionModel?: string;
};

export type LocalSpeechModelConfig = {
  dictationStt: string;
  voiceStt: string;
  voiceTts: string;
  voiceTtsSpeakerId?: number;
  voiceTtsSpeed?: number;
};

export type LocalSpeechProviderConfig = {
  modelsDir: string;
  models: LocalSpeechModelConfig;
};

export const VOICE_PROMPT_BLOCK_START = "<openbeam_voice_mode>";
export const VOICE_PROMPT_BLOCK_END = "</openbeam_voice_mode>";

export type VoiceMcpServerConfig = {
  type: "stdio";
  command: string;
  args: string[];
  env?: Record<string, string>;
};
