import { randomUUID } from "node:crypto";
import { estimateTokens, getConfig } from "@openbeam/ai";
import {
  getTTSModel,
  type ProviderId,
  ProviderIdSchema,
} from "@openbeam/types/ai";
import {
  type AudioNodeConfig,
  AudioNodeConfigSchema,
  type GeneratedAudio,
  type TokenUsage,
} from "@openbeam/types/canvas";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

const OPENAI_VOICES = new Set([
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
]);
const FORMAT_TO_MIME: Record<AudioNodeConfig["outputFormat"], string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
  aac: "audio/aac",
  opus: "audio/opus",
};
const FORMAT_TO_OPENAI: Record<
  AudioNodeConfig["outputFormat"],
  "mp3" | "wav" | "flac" | "opus" | "aac"
> = {
  mp3: "mp3",
  wav: "wav",
  flac: "flac",
  ogg: "opus",
  aac: "aac",
  opus: "opus",
};
const WORDS_PER_MINUTE = 150;
const WHITESPACE = /\s+/g;
const TRAILING_SLASH = /\/$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function resolveMessageText(messages: unknown): string {
  if (!Array.isArray(messages)) {
    return "";
  }
  const lines = messages
    .map((message) => {
      if (!isRecord(message)) {
        return "";
      }
      const role =
        typeof message.role === "string" ? message.role.trim() : "speaker";
      const content =
        typeof message.content === "string" ? message.content.trim() : "";
      return content ? `${role}: ${content}` : "";
    })
    .filter(Boolean);
  return lines.join("\n\n");
}

function resolvePromptInput(input: unknown): string {
  if (typeof input === "string") {
    return input.trim();
  }
  if (Array.isArray(input)) {
    return input
      .map((item) => resolvePromptInput(item))
      .filter(Boolean)
      .join("\n\n");
  }
  if (input === null || input === undefined) {
    return "";
  }
  if (!isRecord(input)) {
    return String(input);
  }

  const candidates = [
    input.text,
    input.content,
    input.input,
    input.prompt,
    input.message,
    input.summary,
    input.body,
    input.output,
    input.answer,
    input.script,
    input.transcript,
  ];
  for (const candidate of candidates) {
    const value = normalizeText(candidate);
    if (value) {
      return value;
    }
  }

  if (Array.isArray(input.texts)) {
    const joined = input.texts
      .map((value) => normalizeText(value))
      .filter(Boolean)
      .join("\n\n");
    if (joined) {
      return joined;
    }
  }

  if (Array.isArray(input.items)) {
    const joined = input.items
      .map((value) => normalizeText(value))
      .filter(Boolean)
      .join("\n\n");
    if (joined) {
      return joined;
    }
  }

  const messageText = resolveMessageText(input.messages);
  if (messageText) {
    return messageText;
  }

  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

function resolveModel(model: string): {
  providerId: ProviderId;
  modelId: string;
  definition?: ReturnType<typeof getTTSModel>;
} {
  const trimmed = model.trim();
  if (!trimmed) {
    throw new Error("Model is required");
  }

  const prefixEnd = trimmed.indexOf(":");
  if (prefixEnd > 0) {
    const prefix = trimmed.slice(0, prefixEnd);
    const candidate = trimmed.slice(prefixEnd + 1);
    const provider = ProviderIdSchema.safeParse(prefix);
    if (provider.success) {
      if (!candidate) {
        throw new Error("Model is required");
      }
      return {
        providerId: provider.data,
        modelId: candidate,
        definition: getTTSModel(candidate),
      };
    }
  }

  const normalized = trimmed.replace(/_/g, "-");
  const known = getTTSModel(trimmed) ?? getTTSModel(normalized);
  if (!known) {
    throw new Error(`Unknown audio model: ${trimmed}`);
  }

  return { providerId: known.provider, modelId: known.id, definition: known };
}

function resolveOpenAIConfig(): { apiKey: string; baseURL: string } {
  const config = getConfig();
  const apiKey = config.providers.openai.apiKey;
  if (!apiKey) {
    throw new Error("OpenAI API key is required for audio generation");
  }
  const baseURL = config.providers.openai.baseURL?.trim();
  return {
    apiKey,
    baseURL:
      baseURL && baseURL.length > 0 ? baseURL : "https://api.openai.com/v1",
  };
}

function normalizeVoice(voice: string, providerId: ProviderId): string {
  if (!voice.trim()) {
    throw new Error("Voice is required");
  }
  if (providerId === "openai" && !OPENAI_VOICES.has(voice)) {
    throw new Error(
      `Unsupported OpenAI voice: ${voice}. Supported voices: ${Array.from(OPENAI_VOICES).join(", ")}`
    );
  }
  return voice.trim();
}

function estimateDurationSeconds(text: string, speed: number): number {
  const words = text.trim().split(WHITESPACE).filter(Boolean).length;
  if (words === 0) {
    return 0;
  }
  const minutes = words / (WORDS_PER_MINUTE * Math.max(speed, 0.01));
  return Math.max(0.1, minutes * 60);
}

function buildTokenUsage(params: {
  text: string;
  model?: ReturnType<typeof getTTSModel>;
}): TokenUsage {
  const input = estimateTokens(params.text);
  const output = 0;
  const total = input;
  const characters = Array.from(params.text).length;
  const perCharacter = params.model?.pricing.perCharacter ?? 0;
  const estimatedCost = characters * perCharacter;
  return { input, output, total, estimatedCost };
}

async function generateOpenAI(params: {
  text: string;
  modelId: string;
  voice: string;
  format: AudioNodeConfig["outputFormat"];
  speed: number;
}): Promise<GeneratedAudio> {
  const { apiKey, baseURL } = resolveOpenAIConfig();
  const response = await fetch(
    `${baseURL.replace(TRAILING_SLASH, "")}/audio/speech`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: params.modelId,
        input: params.text,
        voice: params.voice,
        response_format: FORMAT_TO_OPENAI[params.format],
        speed: params.speed,
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    const suffix = detail ? `: ${detail}` : "";
    throw new Error(`Audio generation failed${suffix}`);
  }

  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mimeType = FORMAT_TO_MIME[params.format];
  const duration = estimateDurationSeconds(params.text, params.speed);

  return {
    id: randomUUID(),
    url: `data:${mimeType};base64,${base64}`,
    duration,
    format: params.format,
  };
}

export const audioExecutor: CanvasNodeExecutor = async ({ node, input }) => {
  const config = AudioNodeConfigSchema.parse(resolveNodeConfig(node.data));

  try {
    const prompt = resolvePromptInput(input);
    if (!prompt) {
      throw new Error("Audio input is required");
    }

    const modelInfo = resolveModel(config.model);
    const voice = normalizeVoice(config.voice, modelInfo.providerId);

    if (modelInfo.providerId !== "openai") {
      throw new Error(`Unsupported audio provider: ${modelInfo.providerId}`);
    }

    if (
      modelInfo.definition?.maxCharacters &&
      prompt.length > modelInfo.definition.maxCharacters
    ) {
      throw new Error(
        `Audio input exceeds max length of ${modelInfo.definition.maxCharacters} characters`
      );
    }

    const audio = await generateOpenAI({
      text: prompt,
      modelId: modelInfo.modelId,
      voice,
      format: config.outputFormat,
      speed: config.speed,
    });

    return {
      prompt,
      audio,
      tokenUsage: buildTokenUsage({
        text: prompt,
        model: modelInfo.definition,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new CanvasNodeExecutionError({
      nodeType: node.type,
      nodeId: node.id,
      message,
      cause: error,
    });
  }
};
