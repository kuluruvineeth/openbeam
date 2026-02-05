import { randomUUID } from "node:crypto";
import { estimateTokens, getConfig } from "@openplane/ai";
import {
  getVideoModel,
  type ProviderId,
  ProviderIdSchema,
} from "@openplane/types/ai";
import {
  type GeneratedVideo,
  type TokenUsage,
  type VideoNodeConfig,
  VideoNodeConfigSchema,
} from "@openplane/types/canvas";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

const VIDEO_DIMENSIONS: Record<
  VideoNodeConfig["aspectRatio"],
  Record<VideoNodeConfig["resolution"], { width: number; height: number }>
> = {
  "16:9": {
    "720p": { width: 1280, height: 720 },
    "1080p": { width: 1920, height: 1080 },
    "4k": { width: 3840, height: 2160 },
  },
  "9:16": {
    "720p": { width: 720, height: 1280 },
    "1080p": { width: 1080, height: 1920 },
    "4k": { width: 2160, height: 3840 },
  },
  "1:1": {
    "720p": { width: 720, height: 720 },
    "1080p": { width: 1080, height: 1080 },
    "4k": { width: 2160, height: 2160 },
  },
  "4:3": {
    "720p": { width: 960, height: 720 },
    "1080p": { width: 1440, height: 1080 },
    "4k": { width: 2880, height: 2160 },
  },
};
const TEXT_KEYS = [
  "prompt",
  "text",
  "content",
  "input",
  "message",
  "summary",
  "body",
  "description",
  "script",
];
const TRAILING_SLASH = /\/$/;

type OpenAIVideoJob = {
  id: string;
  status: string;
  progress?: number;
  error?: { message?: string };
  seconds?: number | string;
  size?: string;
};

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

  for (const key of TEXT_KEYS) {
    const value = normalizeText(input[key]);
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

function buildPrompt(base: string, config: VideoNodeConfig): string {
  const extras: string[] = [];
  if (config.style?.trim()) {
    extras.push(`Style: ${config.style.trim()}`);
  }
  const cameraMotion = config.cameraMotion?.trim();
  if (cameraMotion && cameraMotion !== "none") {
    extras.push(`Camera: ${cameraMotion}`);
  }
  if (config.motionAmount !== undefined) {
    extras.push(`Motion intensity: ${config.motionAmount}/100`);
  }
  if (config.fps && config.fps !== 30) {
    extras.push(`Frame rate: ${config.fps}fps`);
  }
  if (extras.length === 0) {
    return base.trim();
  }
  return [base.trim(), ...extras].join("\n");
}

function resolveModel(model: string): {
  providerId: ProviderId;
  modelId: string;
  definition?: ReturnType<typeof getVideoModel>;
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
        definition: getVideoModel(candidate),
      };
    }
  }

  const known = getVideoModel(trimmed);
  if (!known) {
    throw new Error(`Unknown video model: ${trimmed}`);
  }

  return { providerId: known.provider, modelId: known.id, definition: known };
}

function resolveOpenAIConfig(): { apiKey: string; baseURL: string } {
  const config = getConfig();
  const apiKey = config.providers.openai.apiKey;
  if (!apiKey) {
    throw new Error("OpenAI API key is required for video generation");
  }
  const baseURL = config.providers.openai.baseURL?.trim();
  return {
    apiKey,
    baseURL:
      baseURL && baseURL.length > 0 ? baseURL : "https://api.openai.com/v1",
  };
}

function resolveDurationSeconds(
  duration: number,
  model?: ReturnType<typeof getVideoModel>
): number {
  const value = Number.isFinite(duration) ? Math.round(duration) : 0;
  if (value <= 0) {
    throw new Error("Video duration must be greater than zero");
  }
  if (model?.maxDurationSeconds && value > model.maxDurationSeconds) {
    const label = model.name ?? model.id;
    throw new Error(
      `Video duration exceeds ${model.maxDurationSeconds}s limit for ${label}`
    );
  }
  return value;
}

function resolveDimensions(config: VideoNodeConfig): {
  width: number;
  height: number;
  size: string;
} {
  const dimensions = VIDEO_DIMENSIONS[config.aspectRatio]?.[config.resolution];
  if (!dimensions) {
    throw new Error(
      `Unsupported resolution ${config.resolution} for ${config.aspectRatio}`
    );
  }
  return {
    width: dimensions.width,
    height: dimensions.height,
    size: `${dimensions.width}x${dimensions.height}`,
  };
}

function buildTokenUsage(params: {
  prompt: string;
  durationSeconds: number;
  model?: ReturnType<typeof getVideoModel>;
}): TokenUsage {
  const input = estimateTokens(params.prompt);
  const output = 0;
  const total = input;
  const perMinute = params.model?.pricing.perMinuteGeneration ?? 0;
  const estimatedCost = (params.durationSeconds / 60) * perMinute;
  return { input, output, total, estimatedCost };
}

async function fetchJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const detail = await response.text();
    const suffix = detail ? `: ${detail}` : "";
    throw new Error(`Video generation request failed${suffix}`);
  }
  return (await response.json()) as T;
}

async function createOpenAIVideoJob(params: {
  baseURL: string;
  apiKey: string;
  modelId: string;
  prompt: string;
  seconds: number;
  size: string;
}): Promise<OpenAIVideoJob> {
  return await fetchJson<OpenAIVideoJob>(
    `${params.baseURL.replace(TRAILING_SLASH, "")}/videos`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: params.modelId,
        prompt: params.prompt,
        seconds: String(params.seconds),
        size: params.size,
      }),
    }
  );
}

async function getOpenAIVideoJob(params: {
  baseURL: string;
  apiKey: string;
  id: string;
}): Promise<OpenAIVideoJob> {
  return await fetchJson<OpenAIVideoJob>(
    `${params.baseURL.replace(TRAILING_SLASH, "")}/videos/${params.id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
      },
    }
  );
}

async function downloadOpenAIVideo(params: {
  baseURL: string;
  apiKey: string;
  id: string;
}): Promise<string> {
  const response = await fetch(
    `${params.baseURL.replace(TRAILING_SLASH, "")}/videos/${params.id}/content`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
      },
    }
  );
  if (!response.ok) {
    const detail = await response.text();
    const suffix = detail ? `: ${detail}` : "";
    throw new Error(`Video download failed${suffix}`);
  }
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

async function waitForOpenAIVideo(params: {
  baseURL: string;
  apiKey: string;
  id: string;
  timeoutMs: number;
}): Promise<OpenAIVideoJob> {
  const deadline = Date.now() + params.timeoutMs;
  let delayMs = 2000;

  while (true) {
    const job = await getOpenAIVideoJob({
      baseURL: params.baseURL,
      apiKey: params.apiKey,
      id: params.id,
    });
    if (job.status === "completed") {
      return job;
    }
    if (job.status === "failed" || job.status === "canceled") {
      const message = job.error?.message ?? "Video generation failed";
      throw new Error(message);
    }
    if (Date.now() > deadline) {
      throw new Error("Video generation timed out");
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    delayMs = Math.min(Math.floor(delayMs * 1.5), 10_000);
  }
}

export const videoExecutor: CanvasNodeExecutor = async ({ node, input }) => {
  const config = VideoNodeConfigSchema.parse(resolveNodeConfig(node.data));

  try {
    const promptInput = resolvePromptInput(input);
    if (!promptInput) {
      throw new Error("Video prompt is required");
    }

    const prompt = buildPrompt(promptInput, config);
    const modelInfo = resolveModel(config.model);
    if (modelInfo.providerId !== "openai") {
      throw new Error(`Unsupported video provider: ${modelInfo.providerId}`);
    }

    const seconds = resolveDurationSeconds(
      config.duration,
      modelInfo.definition
    );
    const dimensions = resolveDimensions(config);
    const size = dimensions.size;
    const { apiKey, baseURL } = resolveOpenAIConfig();

    const job = await createOpenAIVideoJob({
      baseURL,
      apiKey,
      modelId: modelInfo.modelId,
      prompt,
      seconds,
      size,
    });

    const completed = await waitForOpenAIVideo({
      baseURL,
      apiKey,
      id: job.id,
      timeoutMs: 8 * 60 * 1000,
    });

    const base64 = await downloadOpenAIVideo({
      baseURL,
      apiKey,
      id: completed.id,
    });

    const durationSeconds = seconds;

    const video: GeneratedVideo = {
      id: randomUUID(),
      url: `data:video/mp4;base64,${base64}`,
      duration: durationSeconds,
      width: dimensions.width,
      height: dimensions.height,
    };

    return {
      prompt,
      video,
      tokenUsage: buildTokenUsage({
        prompt,
        durationSeconds,
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
