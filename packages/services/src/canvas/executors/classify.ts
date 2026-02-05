import { complete } from "@openplane/ai";
import {
  type CompletionOptions,
  getChatModel,
  type ProviderId,
  ProviderIdSchema,
} from "@openplane/types/ai";
import {
  type ClassificationResult,
  type ClassifyCategory,
  type ClassifyExecutionResult,
  ClassifyExecutionResultSchema,
  type ClassifyNodeConfig,
  ClassifyNodeConfigSchema,
} from "@openplane/types/canvas";
import { z } from "zod";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

const JSON_FENCE_REGEX = /```(?:json)?\s*([\s\S]*?)```/i;
const DEFAULT_CONFIDENCE = 0.5;
const NORMALIZE_KEY = /[^a-z0-9]/g;

const ModelResultSchema = z.object({
  category_id: z.string().optional(),
  categoryId: z.string().optional(),
  id: z.string().optional(),
  category: z.string().optional(),
  name: z.string().optional(),
  label: z.string().optional(),
  confidence: z.number().optional(),
  score: z.number().optional(),
  probability: z.number().optional(),
  reasoning: z.string().optional(),
  rationale: z.string().optional(),
});

const ModelOutputSchema = z.object({
  results: z.array(ModelResultSchema),
});

type ParsedOutput = {
  results: ClassificationResult[];
  raw: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(NORMALIZE_KEY, "");
}

function resolveModel(model?: string): {
  providerId?: ProviderId;
  modelId?: string;
} {
  if (!model?.trim()) {
    return {};
  }
  const trimmed = model.trim();
  const prefixEnd = trimmed.indexOf(":");
  if (prefixEnd > 0) {
    const prefix = trimmed.slice(0, prefixEnd);
    const candidate = trimmed.slice(prefixEnd + 1);
    const provider = ProviderIdSchema.safeParse(prefix);
    if (provider.success) {
      return { providerId: provider.data, modelId: candidate || undefined };
    }
  }
  const known = getChatModel(trimmed);
  return { providerId: known?.provider, modelId: trimmed };
}

function buildCompletionOptions(config: ClassifyNodeConfig): CompletionOptions {
  const model = resolveModel(config.model);
  return {
    providerId: model.providerId,
    modelId: model.modelId,
    temperature: config.temperature,
  };
}

function resolveInputText(input: unknown): string {
  if (typeof input === "string") {
    return input.trim();
  }
  if (Array.isArray(input)) {
    return input
      .map((item) => resolveInputText(item))
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
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
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

function buildCategoryIndex(
  categories: ClassifyCategory[]
): Map<string, ClassifyCategory> {
  const index = new Map<string, ClassifyCategory>();
  for (const category of categories) {
    index.set(normalizeKey(category.id), category);
    index.set(normalizeKey(category.name), category);
  }
  return index;
}

function buildCategoryBlock(categories: ClassifyCategory[]): string {
  return categories
    .map((category) => {
      const examples = category.examples?.length
        ? `Examples: ${category.examples.join(" | ")}`
        : "";
      const keywords = category.keywords?.length
        ? `Keywords: ${category.keywords.join(", ")}`
        : "";
      const details = [category.description, examples, keywords]
        .filter(Boolean)
        .join(" ");
      return `<category id="${category.id}" name="${category.name}">
${details}
</category>`;
    })
    .join("\n\n");
}

function applyTemplate(
  template: string,
  values: Record<string, string>
): string {
  let output = template;
  for (const [key, value] of Object.entries(values)) {
    output = output
      .replaceAll(`{{${key}}}`, value)
      .replaceAll(`{${key}}`, value);
  }
  return output;
}

function buildSystemPrompt(
  config: ClassifyNodeConfig,
  categories: ClassifyCategory[]
): string {
  const categoryBlock = buildCategoryBlock(categories);
  const baseInstructions = [
    "Choose the best matching category id for the content.",
    config.allowMultiple
      ? "Return multiple categories when appropriate."
      : "Return only the single best category.",
    "Return JSON only. No prose.",
  ];

  if (config.instructions?.trim()) {
    baseInstructions.push(config.instructions.trim());
  }

  const instructions = baseInstructions
    .map((instruction) => `- ${instruction}`)
    .join("\n");

  const defaultPrompt = `<role>
You are a classification assistant.
</role>

<task>
Classify the content into one or more categories.
</task>

<categories>
${categoryBlock}
</categories>

<instructions>
${instructions}
</instructions>

<output_format>
Return JSON:
{
  "results": [
    {
      "category_id": "category_id",
      "confidence": 0.0,
      "reasoning": "short reason"
    }
  ]
}
</output_format>`;

  if (!config.systemPromptTemplate?.trim()) {
    return defaultPrompt;
  }

  return applyTemplate(config.systemPromptTemplate, {
    categories: categoryBlock,
    instructions,
    mode: config.mode,
    allowMultiple: String(config.allowMultiple),
  });
}

function extractJsonCandidate(text: string): string | null {
  const fenced = JSON_FENCE_REGEX.exec(text);
  if (fenced?.[1]) {
    return fenced[1];
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return text.slice(start, end + 1);
  }
  if (start < 0 && text.includes("[")) {
    const arrayStart = text.indexOf("[");
    const arrayEnd = text.lastIndexOf("]");
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      return text.slice(arrayStart, arrayEnd + 1);
    }
  }
  return null;
}

function parseModelOutput(
  content: string,
  categories: ClassifyCategory[],
  allowMultiple: boolean
): ParsedOutput {
  const candidate = extractJsonCandidate(content);
  if (!candidate) {
    throw new Error("Classification response did not include JSON");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error("Classification response JSON could not be parsed");
  }

  const results = normalizeResults(parsed, categories, allowMultiple);
  return { results, raw: parsed };
}

function normalizeResults(
  parsed: unknown,
  categories: ClassifyCategory[],
  allowMultiple: boolean
): ClassificationResult[] {
  const categoryIndex = buildCategoryIndex(categories);
  const rawResults = extractResultEntries(parsed);

  const normalized: ClassificationResult[] = [];
  const seen = new Map<string, ClassificationResult>();

  for (const entry of rawResults) {
    const normalizedResult = normalizeResultEntry(entry, categoryIndex);
    if (!normalizedResult) {
      continue;
    }
    const existing = seen.get(normalizedResult.categoryId);
    if (!existing || normalizedResult.confidence > existing.confidence) {
      seen.set(normalizedResult.categoryId, normalizedResult);
    }
  }

  for (const result of seen.values()) {
    normalized.push(result);
  }

  normalized.sort((a, b) => b.confidence - a.confidence);

  if (!allowMultiple && normalized.length > 0) {
    const first = normalized[0];
    return first ? [first] : [];
  }
  return normalized;
}

function extractResultEntries(parsed: unknown): unknown[] {
  if (ModelOutputSchema.safeParse(parsed).success) {
    const data = parsed as z.infer<typeof ModelOutputSchema>;
    return data.results;
  }
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (isRecord(parsed)) {
    if (Array.isArray(parsed.results)) {
      return parsed.results;
    }
    return [parsed];
  }
  return [];
}

function normalizeResultEntry(
  entry: unknown,
  categoryIndex: Map<string, ClassifyCategory>
): ClassificationResult | null {
  if (typeof entry === "string") {
    const normalized = categoryIndex.get(normalizeKey(entry));
    if (!normalized) {
      return null;
    }
    return {
      categoryId: normalized.id,
      categoryName: normalized.name,
      confidence: DEFAULT_CONFIDENCE,
    };
  }

  if (!isRecord(entry)) {
    return null;
  }

  let candidateId = "";
  if (typeof entry.category_id === "string") {
    candidateId = entry.category_id;
  } else if (typeof entry.categoryId === "string") {
    candidateId = entry.categoryId;
  } else if (typeof entry.id === "string") {
    candidateId = entry.id;
  } else if (typeof entry.category === "string") {
    candidateId = entry.category;
  } else if (typeof entry.label === "string") {
    candidateId = entry.label;
  } else if (typeof entry.name === "string") {
    candidateId = entry.name;
  }

  if (!candidateId) {
    return null;
  }

  const category = categoryIndex.get(normalizeKey(candidateId));
  if (!category) {
    return null;
  }

  let confidence = DEFAULT_CONFIDENCE;
  if (typeof entry.confidence === "number") {
    confidence = entry.confidence;
  } else if (typeof entry.score === "number") {
    confidence = entry.score;
  } else if (typeof entry.probability === "number") {
    confidence = entry.probability;
  }

  let reasoning: string | undefined;
  if (typeof entry.reasoning === "string") {
    reasoning = entry.reasoning;
  } else if (typeof entry.rationale === "string") {
    reasoning = entry.rationale;
  }

  return {
    categoryId: category.id,
    categoryName: category.name,
    confidence: Math.max(0, Math.min(confidence, 1)),
    reasoning: reasoning?.trim() || undefined,
  };
}

function applyConfidenceThreshold(
  results: ClassificationResult[],
  threshold: number,
  allowMultiple: boolean
): ClassificationResult[] {
  if (results.length === 0) {
    return results;
  }

  if (!allowMultiple) {
    const first = results[0];
    if (!first) {
      return [];
    }
    return first.confidence >= threshold ? results : [];
  }

  return results.filter((result) => result.confidence >= threshold);
}

function resolveFallbackCategory(
  config: ClassifyNodeConfig,
  categories: ClassifyCategory[]
): ClassifyCategory | null {
  if (config.fallbackCategoryId) {
    const byId = categories.find(
      (category) => category.id === config.fallbackCategoryId
    );
    if (byId) {
      return byId;
    }
  }
  const fallbackCategory = categories.find((category) => category.isFallback);
  return fallbackCategory ?? null;
}

function buildFallbackResult(
  category: ClassifyCategory,
  threshold: number
): ClassificationResult {
  return {
    categoryId: category.id,
    categoryName: category.name,
    confidence: Math.max(threshold, DEFAULT_CONFIDENCE),
  };
}

function handleFallback(params: {
  config: ClassifyNodeConfig;
  categories: ClassifyCategory[];
  threshold: number;
  thresholdedResults: ClassificationResult[];
  rawResults: ClassificationResult[];
}): { results: ClassificationResult[]; isFallback: boolean } {
  const { config, categories, threshold, thresholdedResults, rawResults } =
    params;

  if (thresholdedResults.length > 0) {
    if (config.fallbackBehavior === "lowest_match") {
      const first = thresholdedResults[0];
      return {
        results: thresholdedResults,
        isFallback: first ? first.confidence < threshold : true,
      };
    }
    return { results: thresholdedResults, isFallback: false };
  }

  if (config.fallbackBehavior === "discard") {
    return { results: [], isFallback: true };
  }

  if (config.fallbackBehavior === "error") {
    throw new Error("Classification confidence below threshold");
  }

  if (config.fallbackBehavior === "lowest_match") {
    const first = rawResults[0];
    return { results: first ? [first] : [], isFallback: true };
  }

  const fallbackCategory = resolveFallbackCategory(config, categories);
  if (fallbackCategory) {
    return {
      results: [buildFallbackResult(fallbackCategory, threshold)],
      isFallback: true,
    };
  }

  return { results: [], isFallback: true };
}

async function runClassification(params: {
  content: string;
  systemPrompt: string;
  options: CompletionOptions;
}): Promise<{
  content: string;
  usage: { inputTokens: number; outputTokens: number };
}> {
  const completion = await complete(
    [{ role: "user", content: params.content }],
    {
      ...params.options,
      systemPrompt: params.systemPrompt,
    }
  );
  return {
    content: completion.content ?? "",
    usage: {
      inputTokens: completion.usage.inputTokens,
      outputTokens: completion.usage.outputTokens,
    },
  };
}

function buildFixPrompt(systemPrompt: string): string {
  return `${systemPrompt}

<fix>
Return JSON only. Do not include prose, markdown, or code fences.
</fix>`;
}

export const classifyExecutor: CanvasNodeExecutor = async ({ node, input }) => {
  const config = ClassifyNodeConfigSchema.parse(resolveNodeConfig(node.data));
  const startedAt = Date.now();

  try {
    if (config.categories.length === 0) {
      throw new Error("Classification categories are required");
    }

    const content = resolveInputText(input);
    if (!content.trim()) {
      throw new Error("Classification input is required");
    }

    const allowMultiple = config.allowMultiple && config.mode !== "routing";
    const systemPrompt = buildSystemPrompt(config, config.categories);
    const options = buildCompletionOptions(config);
    const payload = `<content>
${content}
</content>`;

    let completion = await runClassification({
      content: payload,
      systemPrompt,
      options,
    });

    let parsed: ParsedOutput;

    try {
      parsed = parseModelOutput(
        completion.content,
        config.categories,
        allowMultiple
      );
    } catch (error) {
      if (!config.enableAutoFix) {
        throw error;
      }
      completion = await runClassification({
        content: payload,
        systemPrompt: buildFixPrompt(systemPrompt),
        options,
      });
      parsed = parseModelOutput(
        completion.content,
        config.categories,
        allowMultiple
      );
    }

    const thresholded = applyConfidenceThreshold(
      parsed.results,
      config.confidenceThreshold,
      allowMultiple
    );

    const fallback = handleFallback({
      config,
      categories: config.categories,
      threshold: config.confidenceThreshold,
      thresholdedResults: thresholded,
      rawResults: parsed.results,
    });

    const result: ClassifyExecutionResult = {
      results: fallback.results,
      isFallback: fallback.isFallback,
      usage: {
        inputTokens: completion.usage.inputTokens,
        outputTokens: completion.usage.outputTokens,
        latencyMs: Date.now() - startedAt,
      },
    };

    return ClassifyExecutionResultSchema.parse(result);
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
