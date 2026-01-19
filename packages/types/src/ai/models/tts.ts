import type { TTSModel } from "./types";

export const OPENAI_TTS_MODELS: TTSModel[] = [
  {
    id: "gpt-4o-mini-tts",
    name: "GPT-4o Mini TTS",
    provider: "openai",
    maxCharacters: 4096,
    supportedLanguages: 32,
    supportsCloning: false,
    supportsStreaming: true,
    latencyMs: 250,
    pricing: { perCharacter: 0.000_015 },
  },
  {
    id: "tts-1",
    name: "TTS-1",
    provider: "openai",
    maxCharacters: 4096,
    supportedLanguages: 32,
    supportsCloning: false,
    supportsStreaming: true,
    latencyMs: 300,
    pricing: { perCharacter: 0.000_015 },
  },
  {
    id: "tts-1-hd",
    name: "TTS-1 HD",
    provider: "openai",
    maxCharacters: 4096,
    supportedLanguages: 32,
    supportsCloning: false,
    supportsStreaming: true,
    latencyMs: 400,
    pricing: { perCharacter: 0.000_03 },
  },
];

export const ELEVENLABS_TTS_MODELS: TTSModel[] = [
  {
    id: "eleven-multilingual-v2",
    name: "ElevenLabs Multilingual v2",
    provider: "elevenlabs",
    supportedLanguages: 70,
    supportsCloning: true,
    supportsStreaming: true,
    latencyMs: 100,
    pricing: { perCharacter: 0.000_18 },
  },
  {
    id: "eleven-flash-v2.5",
    name: "ElevenLabs Flash v2.5",
    provider: "elevenlabs",
    supportedLanguages: 32,
    supportsCloning: true,
    supportsStreaming: true,
    latencyMs: 75,
    pricing: { perCharacter: 0.000_045 },
  },
  {
    id: "eleven-turbo-v2.5",
    name: "ElevenLabs Turbo v2.5",
    provider: "elevenlabs",
    supportedLanguages: 32,
    supportsCloning: true,
    supportsStreaming: true,
    latencyMs: 50,
    pricing: { perCharacter: 0.000_09 },
  },
];

export const CARTESIA_TTS_MODELS: TTSModel[] = [
  {
    id: "sonic-2",
    name: "Cartesia Sonic 2.0",
    provider: "cartesia",
    supportedLanguages: 15,
    supportsCloning: true,
    supportsStreaming: true,
    latencyMs: 40,
    pricing: { perCharacter: 0.000_036 },
  },
  {
    id: "sonic-2-turbo",
    name: "Cartesia Sonic 2.0 Turbo",
    provider: "cartesia",
    supportedLanguages: 15,
    supportsCloning: true,
    supportsStreaming: true,
    latencyMs: 30,
    pricing: { perCharacter: 0.000_054 },
  },
];

export const PLAYHT_TTS_MODELS: TTSModel[] = [
  {
    id: "playht-2.0-turbo",
    name: "PlayHT 2.0 Turbo",
    provider: "playht",
    supportedLanguages: 140,
    supportsCloning: true,
    supportsStreaming: true,
    latencyMs: 200,
    pricing: { perCharacter: 0.000_05 },
  },
];

export const TTS_MODELS: TTSModel[] = [
  ...OPENAI_TTS_MODELS,
  ...ELEVENLABS_TTS_MODELS,
  ...CARTESIA_TTS_MODELS,
  ...PLAYHT_TTS_MODELS,
];

export const DEFAULT_TTS_MODEL_ID = "eleven-flash-v2.5";
