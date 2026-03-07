import { randomUUID } from "node:crypto";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { complete, estimateTokens, getConfig } from "@openbeam/ai";
import {
  getImageModel,
  type ProviderId,
  ProviderIdSchema,
} from "@openbeam/types/ai";
import {
  type GeneratedImage,
  type ImageNodeConfig,
  ImageNodeConfigSchema,
  type TokenUsage,
} from "@openbeam/types/canvas";
import { generateImage, type ImageModel } from "ai";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

const JSON_FENCE_REGEX = /```(?:json)?\s*([\s\S]*?)```/i;
const PROMPT_PREFIX = /^(prompt|enhanced prompt|image prompt)\s*:\s*/i;
const SIZE_REGEX = /^(\d+)x(\d+)$/;
const ENHANCE_SYSTEM_PROMPT = `<role>
You refine image prompts for enterprise creative workflows.
</role>

<instructions>
Rewrite the user prompt into a vivid, concrete image description while preserving the original intent.
Add specific visual details (subject, setting, lighting, composition, materials, mood).
Keep it concise: one to two sentences.
Avoid brand names or artist names unless provided by the user.
If a negative prompt is provided, ensure the description avoids those elements without repeating them.
Return only the improved prompt text.
</instructions>

<output_format>
Plain text only. No quotes, no markdown.
</output_format>`;

type UsageCounts = { inputTokens: number; outputTokens: number };

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
    input.prompt,
    input.input,
    input.text,
    input.content,
    input.message,
    input.query,
    input.description,
  ];
  for (const candidate of candidates) {
    const value = normalizeText(candidate);
    if (value) {
      return value;
    }
  }

  if (Array.isArray(input.messages)) {
    const lines = input.messages
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
    if (lines.length > 0) {
      return lines.join("\n\n");
    }
  }

  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

function resolveNegativePrompt(
  input: unknown,
  config: ImageNodeConfig
): string | undefined {
  if (isRecord(input)) {
    const candidates = [
      input.negativePrompt,
      input.negative,
      input.avoid,
      input.exclude,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  const configValue = config.negativePrompt?.trim();
  return configValue ? configValue : undefined;
}

function normalizeEnhancedPrompt(text: string): string {
  let value = text.trim();
  const fenced = JSON_FENCE_REGEX.exec(value);
  if (fenced?.[1]) {
    value = fenced[1].trim();
  }
  value = value.replace(PROMPT_PREFIX, "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function buildEnhanceInput(prompt: string, negativePrompt?: string): string {
  const negativeBlock = negativePrompt
    ? `\n<negative_prompt>\n${negativePrompt}\n</negative_prompt>`
    : "";
  return `<prompt>
${prompt}
</prompt>${negativeBlock}`;
}

async function enhancePrompt(params: {
  prompt: string;
  negativePrompt?: string;
}): Promise<{ prompt: string; usage: UsageCounts }> {
  const completion = await complete(
    [
      {
        role: "user",
        content: buildEnhanceInput(params.prompt, params.negativePrompt),
      },
    ],
    { systemPrompt: ENHANCE_SYSTEM_PROMPT, temperature: 0.4, maxTokens: 256 }
  );
  const normalized = normalizeEnhancedPrompt(completion.content ?? "");
  return {
    prompt: normalized || params.prompt,
    usage: {
      inputTokens: completion.usage.inputTokens,
      outputTokens: completion.usage.outputTokens,
    },
  };
}

function resolveModel(model: string): {
  providerId: ProviderId;
  modelId: string;
  definition?: ReturnType<typeof getImageModel>;
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
        definition: getImageModel(candidate),
      };
    }
  }

  const known = getImageModel(trimmed);
  if (!known) {
    throw new Error(`Unknown image model: ${trimmed}`);
  }

  return { providerId: known.provider, modelId: known.id, definition: known };
}

function createImageModel(params: {
  providerId: ProviderId;
  modelId: string;
}): ImageModel {
  const config = getConfig();

  if (params.providerId === "openai") {
    const openaiConfig = config.providers.openai;
    if (!openaiConfig.apiKey) {
      throw new Error("OpenAI API key is not configured");
    }
    const openai = createOpenAI({
      apiKey: openaiConfig.apiKey,
      organization: openaiConfig.organization,
      baseURL: openaiConfig.baseURL,
    });
    return openai.image(params.modelId);
  }

  if (params.providerId === "google") {
    const googleConfig = config.providers.google;
    if (!googleConfig.apiKey) {
      throw new Error("Google AI API key is not configured");
    }
    const google = createGoogleGenerativeAI({ apiKey: googleConfig.apiKey });
    return google.image(params.modelId);
  }

  throw new Error(`Image provider "${params.providerId}" is not supported`);
}

function resolveDimensions(size: string): { width: number; height: number } {
  const match = SIZE_REGEX.exec(size);
  if (!match) {
    return { width: 0, height: 0 };
  }
  return {
    width: Number.parseInt(match[1] ?? "0", 10),
    height: Number.parseInt(match[2] ?? "0", 10),
  };
}

function resolveAspectRatio(
  size: string
): "1:1" | "3:4" | "4:3" | "9:16" | "16:9" {
  const { width, height } = resolveDimensions(size);
  if (!(width && height)) {
    return "1:1";
  }
  if (width === height) {
    return "1:1";
  }
  const ratio = width / height;
  if (ratio > 1) {
    return ratio >= 1.5 ? "16:9" : "4:3";
  }
  return ratio <= 0.7 ? "9:16" : "3:4";
}

function buildFinalPrompt(prompt: string, negativePrompt?: string): string {
  if (!negativePrompt) {
    return prompt;
  }
  return `${prompt}\n\nAvoid: ${negativePrompt}`;
}

function resolveRevisedPrompts(metadata: unknown): Array<string | undefined> {
  if (!isRecord(metadata)) {
    return [];
  }
  const openai = metadata.openai;
  if (!isRecord(openai)) {
    return [];
  }
  const images = openai.images;
  if (!Array.isArray(images)) {
    return [];
  }
  return images.map((entry) =>
    isRecord(entry) && typeof entry.revisedPrompt === "string"
      ? entry.revisedPrompt
      : undefined
  );
}

function buildProviderOptions(
  providerId: ProviderId,
  model: ReturnType<typeof getImageModel> | undefined,
  config: ImageNodeConfig
): Record<string, Record<string, string>> | undefined {
  if (providerId !== "openai") {
    return;
  }
  const options: Record<string, string> = {};
  if (model?.supportsQuality && config.quality) {
    options.quality = config.quality;
  }
  if (model?.supportsStyle && config.style) {
    options.style = config.style;
  }
  if (Object.keys(options).length === 0) {
    return;
  }
  return { openai: options };
}

function buildTokenUsage(params: {
  prompt: string;
  enhancement: UsageCounts;
  imageUsage?: { inputTokens?: number; outputTokens?: number };
  imageCount: number;
  model?: ReturnType<typeof getImageModel>;
}): TokenUsage {
  const promptTokens = estimateTokens(params.prompt);
  const inputTokens =
    params.enhancement.inputTokens +
    (params.imageUsage?.inputTokens ?? promptTokens);
  const outputTokens =
    params.enhancement.outputTokens + (params.imageUsage?.outputTokens ?? 0);
  const estimatedCost = params.model
    ? params.model.pricing.perImage * params.imageCount
    : 0;
  return {
    input: inputTokens,
    output: outputTokens,
    total: inputTokens + outputTokens,
    estimatedCost,
  };
}

export const imageExecutor: CanvasNodeExecutor = async ({ node, input }) => {
  const config = ImageNodeConfigSchema.parse(resolveNodeConfig(node.data));

  try {
    const basePrompt = resolvePromptInput(input);
    if (!basePrompt.trim()) {
      throw new Error("Prompt is required for image generation");
    }

    const negativePrompt = resolveNegativePrompt(input, config);
    let prompt = basePrompt;
    let enhancement: UsageCounts = { inputTokens: 0, outputTokens: 0 };

    if (config.enhancePrompt) {
      try {
        const enhanced = await enhancePrompt({
          prompt: basePrompt,
          negativePrompt,
        });
        prompt = enhanced.prompt || basePrompt;
        enhancement = enhanced.usage;
      } catch {
        prompt = basePrompt;
        enhancement = { inputTokens: 0, outputTokens: 0 };
      }
    }

    const finalPrompt = buildFinalPrompt(prompt, negativePrompt);
    if (!finalPrompt.trim()) {
      throw new Error("Prompt is required for image generation");
    }

    const modelInfo = resolveModel(config.model);
    const imageModel = createImageModel({
      providerId: modelInfo.providerId,
      modelId: modelInfo.modelId,
    });
    const providerOptions = buildProviderOptions(
      modelInfo.providerId,
      modelInfo.definition,
      config
    );
    const aspectRatio =
      modelInfo.providerId === "google"
        ? resolveAspectRatio(config.size)
        : undefined;
    const size = modelInfo.providerId === "google" ? undefined : config.size;

    const result = await generateImage({
      model: imageModel,
      prompt: finalPrompt,
      n: config.numberOfImages,
      size,
      aspectRatio,
      seed: config.seed,
      providerOptions,
    });

    const dimensions = resolveDimensions(config.size);
    const revisedPrompts = resolveRevisedPrompts(result.providerMetadata);
    const images: GeneratedImage[] = result.images.map((image, index) => ({
      id: randomUUID(),
      url: `data:${image.mediaType};base64,${image.base64}`,
      revisedPrompt: revisedPrompts[index],
      width: dimensions.width,
      height: dimensions.height,
    }));

    const tokenUsage = buildTokenUsage({
      prompt: finalPrompt,
      enhancement,
      imageUsage: result.usage,
      imageCount: images.length,
      model: modelInfo.definition,
    });

    return {
      prompt: finalPrompt,
      images,
      tokenUsage,
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
