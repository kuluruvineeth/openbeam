import path from "node:path";

import { describe, expect, test } from "vitest";

import { PersistedConfigSchema } from "../persisted-config";
import { resolveSpeechConfig } from "./speech-config-resolver";

describe("resolveSpeechConfig", () => {
  test("resolves local-first defaults without env overrides", () => {
    const openbeamHome = "/tmp/openbeam-home";
    const persisted = PersistedConfigSchema.parse({});
    const env = {} as NodeJS.ProcessEnv;

    const result = resolveSpeechConfig({
      openbeamHome,
      env,
      persisted,
    });

    expect(result.openai).toBeUndefined();
    expect(result.speech.providers.dictationStt).toEqual({
      provider: "local",
      explicit: false,
      enabled: true,
    });
    expect(result.speech.providers.voiceStt).toEqual({
      provider: "local",
      explicit: false,
      enabled: true,
    });
    expect(result.speech.providers.voiceTts).toEqual({
      provider: "local",
      explicit: false,
      enabled: true,
    });
    expect(result.speech.local).toEqual({
      modelsDir: path.join(openbeamHome, "models", "local-speech"),
      models: {
        dictationStt: "parakeet-tdt-0.6b-v2-int8",
        voiceStt: "parakeet-tdt-0.6b-v2-int8",
        voiceTts: "kokoro-en-v0_19",
        voiceTtsSpeakerId: 0,
      },
    });
    expect(result.speech.local?.models.dictationStt).toBe(
      "parakeet-tdt-0.6b-v2-int8"
    );
    expect(result.speech.local?.models.voiceStt).toBe(
      "parakeet-tdt-0.6b-v2-int8"
    );
    expect(result.speech.local?.models.voiceTts).toBe("kokoro-en-v0_19");
    expect(result.speech.local?.models.voiceTtsSpeakerId).toBe(0);
  });

  test("resolves feature-scoped local model env vars", () => {
    const persisted = PersistedConfigSchema.parse({
      features: {
        voiceMode: {
          stt: { provider: "openai", model: "gpt-4o-transcribe" },
        },
      },
      providers: {
        openai: { apiKey: "persisted-key" },
      },
    });
    const env = {
      OPENBEAM_DICTATION_LOCAL_STT_MODEL: "zipformer",
      OPENBEAM_VOICE_LOCAL_STT_MODEL: "parakeet",
      OPENBEAM_VOICE_LOCAL_TTS_MODEL: "kitten",
      OPENBEAM_VOICE_LOCAL_TTS_SPEAKER_ID: "5",
      OPENBEAM_VOICE_LOCAL_TTS_SPEED: "1.35",
      OPENBEAM_LOCAL_MODELS_DIR: "/tmp/models",
      OPENAI_API_KEY: "env-key",
      OPENBEAM_VOICE_STT_PROVIDER: "openai",
      OPENBEAM_DICTATION_STT_PROVIDER: "local",
      OPENBEAM_VOICE_TTS_PROVIDER: "local",
    } as NodeJS.ProcessEnv;

    const result = resolveSpeechConfig({
      openbeamHome: "/tmp/openbeam-home",
      env,
      persisted,
    });

    expect(result.speech.local).toEqual({
      modelsDir: "/tmp/models",
      models: {
        dictationStt: "zipformer-bilingual-zh-en-2023-02-20",
        voiceStt: "parakeet-tdt-0.6b-v3-int8",
        voiceTts: "kitten-nano-en-v0_1-fp16",
        voiceTtsSpeakerId: 5,
        voiceTtsSpeed: 1.35,
      },
    });
    expect(result.speech.providers.dictationStt).toEqual({
      provider: "local",
      explicit: true,
      enabled: true,
    });
    expect(result.speech.providers.voiceStt).toEqual({
      provider: "openai",
      explicit: true,
      enabled: true,
    });
    expect(result.speech.providers.voiceTts).toEqual({
      provider: "local",
      explicit: true,
      enabled: true,
    });
    expect(result.speech.local?.models.dictationStt).toBe(
      "zipformer-bilingual-zh-en-2023-02-20"
    );
    expect(result.speech.local?.models.voiceStt).toBe(
      "parakeet-tdt-0.6b-v3-int8"
    );
    expect(result.speech.local?.models.voiceTts).toBe(
      "kitten-nano-en-v0_1-fp16"
    );
    expect(result.speech.local?.models.voiceTtsSpeakerId).toBe(5);
    expect(result.speech.local?.models.voiceTtsSpeed).toBe(1.35);
    expect(result.openai?.apiKey).toBe("env-key");
    expect(result.openai?.stt?.model).toBe("gpt-4o-transcribe");
  });

  test("ignores deprecated shared local model env vars", () => {
    const persisted = PersistedConfigSchema.parse({});
    const env = {
      OPENBEAM_LOCAL_STT_MODEL: "zipformer-bilingual-zh-en-2023-02-20",
      OPENBEAM_LOCAL_TTS_MODEL: "kitten-nano-en-v0_1-fp16",
    } as NodeJS.ProcessEnv;

    const result = resolveSpeechConfig({
      openbeamHome: "/tmp/openbeam-home",
      env,
      persisted,
    });

    expect(result.speech.local?.models.dictationStt).toBe(
      "parakeet-tdt-0.6b-v2-int8"
    );
    expect(result.speech.local?.models.voiceStt).toBe(
      "parakeet-tdt-0.6b-v2-int8"
    );
    expect(result.speech.local?.models.voiceTts).toBe("kokoro-en-v0_19");
    expect(result.speech.local?.models.voiceTtsSpeakerId).toBe(0);
  });

  test("respects disabled dictation and voice mode feature flags", () => {
    const persisted = PersistedConfigSchema.parse({
      features: {
        dictation: { enabled: false },
        voiceMode: { enabled: false },
      },
    });

    const result = resolveSpeechConfig({
      openbeamHome: "/tmp/openbeam-home",
      env: {} as NodeJS.ProcessEnv,
      persisted,
    });

    expect(result.speech.providers.dictationStt).toEqual({
      provider: "local",
      explicit: false,
      enabled: false,
    });
    expect(result.speech.providers.voiceStt).toEqual({
      provider: "local",
      explicit: false,
      enabled: false,
    });
    expect(result.speech.providers.voiceTts).toEqual({
      provider: "local",
      explicit: false,
      enabled: false,
    });
  });
});
