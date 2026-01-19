import type { STTModel } from "./types";

export const OPENAI_STT_MODELS: STTModel[] = [
  {
    id: "gpt-4o-transcribe",
    name: "GPT-4o Transcribe",
    provider: "openai",
    supportedLanguages: 100,
    supportsRealtime: true,
    supportsDiarization: false,
    supportsPunctuation: true,
    wordErrorRate: 0.08,
    pricing: { perMinute: 0.006 },
  },
  {
    id: "whisper-large-v3-turbo",
    name: "Whisper Large v3 Turbo",
    provider: "openai",
    supportedLanguages: 99,
    supportsRealtime: false,
    supportsDiarization: false,
    supportsPunctuation: true,
    wordErrorRate: 0.1,
    isLocal: true,
    pricing: { perMinute: 0.006 },
  },
];

export const DEEPGRAM_STT_MODELS: STTModel[] = [
  {
    id: "nova-3",
    name: "Deepgram Nova-3",
    provider: "deepgram",
    supportedLanguages: 47,
    supportsRealtime: true,
    supportsDiarization: true,
    supportsPunctuation: true,
    wordErrorRate: 0.18,
    pricing: { perMinute: 0.0043 },
  },
  {
    id: "nova-3-medical",
    name: "Deepgram Nova-3 Medical",
    provider: "deepgram",
    supportedLanguages: 1,
    supportsRealtime: true,
    supportsDiarization: true,
    supportsPunctuation: true,
    wordErrorRate: 0.15,
    pricing: { perMinute: 0.0065 },
  },
];

export const ASSEMBLYAI_STT_MODELS: STTModel[] = [
  {
    id: "universal-2",
    name: "AssemblyAI Universal-2",
    provider: "assemblyai",
    supportedLanguages: 99,
    supportsRealtime: true,
    supportsDiarization: true,
    supportsPunctuation: true,
    wordErrorRate: 0.145,
    pricing: { perMinute: 0.0037 },
  },
  {
    id: "best",
    name: "AssemblyAI Best",
    provider: "assemblyai",
    supportedLanguages: 99,
    supportsRealtime: false,
    supportsDiarization: true,
    supportsPunctuation: true,
    wordErrorRate: 0.12,
    pricing: { perMinute: 0.0062 },
  },
];

export const STT_MODELS: STTModel[] = [
  ...OPENAI_STT_MODELS,
  ...DEEPGRAM_STT_MODELS,
  ...ASSEMBLYAI_STT_MODELS,
];

export const DEFAULT_STT_MODEL_ID = "gpt-4o-transcribe";
