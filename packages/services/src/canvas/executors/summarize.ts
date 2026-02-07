import { complete, estimateTokens } from "@openplane/ai";
import {
  type CompletionOptions,
  getChatModel,
  type ProviderId,
  ProviderIdSchema,
} from "@openplane/types/ai";
import {
  type ActionItem,
  ActionItemSchema,
  type Citation,
  CitationSchema,
  type ExtractedEntity,
  ExtractedEntitySchema,
  type SummarizationStrategy,
  type SummarizeExecutionResult,
  type SummarizeNodeConfig,
  SummarizeNodeConfigSchema,
  type SummaryFocusArea,
  type SummaryLength,
  type SummaryOutputFormat,
} from "@openplane/types/canvas";
import { z } from "zod";
import { CanvasNodeExecutionError } from "../errors";
import { resolveNodeConfig } from "../node-config";
import type { CanvasNodeExecutor } from "../types";

const JSON_FENCE_REGEX = /```(?:json)?\s*([\s\S]*?)```/i;
const PARAGRAPH_SPLIT = /\n\s*\n/;
const SENTENCE_SPLIT = /(?<=[.!?])\s+(?=[A-Z])/;
const WHITESPACE = /\s+/g;
const SOURCE_SNIPPET_LIMIT = 800;
const DEFAULT_WORD_LIMITS: Record<SummaryLength, number> = {
  brief: 80,
  standard: 160,
  detailed: 320,
  custom: 160,
};
const DEFAULT_SUMMARY_TEXT = "Insufficient content to summarize.";

type SummarySource = {
  documentId: string;
  chunkId?: string;
  title: string;
  snippet: string;
  url?: string;
};

type SummaryInput = {
  text: string;
  citations: Citation[];
  sources: SummarySource[];
};

type SummaryUsage = {
  inputTokens: number;
  outputTokens: number;
};

type SummaryOutput = {
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  entities: ExtractedEntity[];
};

const ModelOutputSchema = z.object({
  summary: z.string(),
  key_points: z.array(z.string()).optional(),
  action_items: z.array(ActionItemSchema).optional(),
  entities: z.array(ExtractedEntitySchema).optional(),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeWhitespace(value: string): string {
  return value.replace(WHITESPACE, " ").trim();
}

function resolveTextValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function resolveArrayText(items: unknown[]): string {
  const stringItems = items.filter(
    (item): item is string => typeof item === "string"
  );
  if (stringItems.length === items.length) {
    return stringItems
      .map((item) => item.trim())
      .filter(Boolean)
      .join("\n\n");
  }
  const contentItems = items
    .map((item) => {
      if (isRecord(item) && typeof item.content === "string") {
        return item.content.trim();
      }
      return "";
    })
    .filter(Boolean);
  if (contentItems.length > 0) {
    return contentItems.join("\n\n");
  }
  return resolveTextValue(items);
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

function resolveChunkSources(value: unknown): SummarySource[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const sources: SummarySource[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }
    const content = typeof entry.content === "string" ? entry.content : "";
    if (!content.trim()) {
      continue;
    }
    let documentId = "";
    if (typeof entry.documentId === "string") {
      documentId = entry.documentId;
    } else if (typeof entry.id === "string") {
      documentId = entry.id;
    }
    let title = "Untitled";
    if (typeof entry.documentTitle === "string") {
      title = entry.documentTitle;
    } else if (typeof entry.title === "string") {
      title = entry.title;
    }
    const url = typeof entry.url === "string" ? entry.url : undefined;
    const chunkId = typeof entry.id === "string" ? entry.id : undefined;
    if (!documentId) {
      continue;
    }
    sources.push({
      documentId,
      chunkId,
      title: title.trim() || "Untitled",
      snippet: content.trim().slice(0, SOURCE_SNIPPET_LIMIT),
      url,
    });
  }
  return sources;
}

function resolveCitations(value: unknown): Citation[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const citations: Citation[] = [];
  for (const item of value) {
    const parsed = CitationSchema.safeParse(item);
    if (parsed.success) {
      citations.push(parsed.data);
    }
  }
  return citations;
}

function buildCitationsFromSources(sources: SummarySource[]): Citation[] {
  return sources.map((source) => ({
    documentId: source.documentId,
    chunkId: source.chunkId,
    title: source.title,
    snippet: source.snippet,
    url: source.url,
  }));
}

function resolveSummaryInput(input: unknown): SummaryInput {
  if (Array.isArray(input)) {
    return {
      text: resolveArrayText(input),
      citations: [],
      sources: [],
    };
  }
  if (!isRecord(input)) {
    return {
      text: resolveTextValue(input),
      citations: [],
      sources: [],
    };
  }

  const sources = resolveChunkSources(input.chunks);
  const citations = resolveCitations(input.citations);
  const directTextCandidates = [
    input.text,
    input.content,
    input.summary,
    input.answer,
    input.output,
    input.input,
    input.prompt,
    input.message,
  ];

  for (const candidate of directTextCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return {
        text: candidate.trim(),
        citations,
        sources,
      };
    }
  }

  const messageText = resolveMessageText(input.messages);
  if (messageText) {
    return {
      text: messageText,
      citations,
      sources,
    };
  }

  if (sources.length > 0) {
    return {
      text: sources.map((source) => source.snippet).join("\n\n"),
      citations,
      sources,
    };
  }

  if (Array.isArray(input.items)) {
    return {
      text: resolveArrayText(input.items),
      citations,
      sources,
    };
  }

  return {
    text: resolveTextValue(input),
    citations,
    sources,
  };
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

function resolveWordLimit(config: SummarizeNodeConfig): number {
  if (config.maxWords && config.maxWords > 0) {
    return config.maxWords;
  }
  return DEFAULT_WORD_LIMITS[config.length];
}

function resolveLengthInstruction(config: SummarizeNodeConfig): string {
  const maxWords = resolveWordLimit(config);
  return `Keep the total under ${maxWords} words.`;
}

function resolveFormatInstruction(format: SummaryOutputFormat): string {
  const formatMap: Record<SummaryOutputFormat, string> = {
    paragraph: "Write in short paragraphs.",
    bullets: "Use bullet points with '-' prefixes.",
    executive: "Use an executive summary tone with short paragraphs.",
    key_points: "Focus on key points in bullet form.",
    action_items: "Focus on action items in bullet form.",
    timeline: "Present a chronological timeline.",
    qa_pairs: "Present Q&A pairs with 'Q:' and 'A:' prefixes.",
  };
  return formatMap[format];
}

function resolveFocusInstruction(
  focusAreas?: SummaryFocusArea[]
): string | null {
  if (!focusAreas || focusAreas.length === 0) {
    return null;
  }
  return `Focus on: ${focusAreas.join(", ")}.`;
}

function resolveStructureInstruction(preserveStructure: boolean): string {
  return preserveStructure
    ? "Retain the structure and section ordering from the source when clear."
    : "Use only structure that exists in the source.";
}

function resolveEntityInstruction(extractEntities: boolean): string | null {
  if (!extractEntities) {
    return null;
  }
  return "Populate entities with people, organizations, dates, metrics, and products mentioned.";
}

function resolveCitationInstruction(
  hasSources: boolean,
  style: string
): string | null {
  if (!hasSources) {
    return null;
  }
  if (style === "footnote") {
    return "Include citations as footnotes using [n] where n is the source id.";
  }
  if (style === "inline") {
    return "Include citations inline using [n] where n is the source id.";
  }
  return "Do not include citations in the summary text.";
}

function buildPromptBase(params: {
  config: SummarizeNodeConfig;
  hasSources: boolean;
  mode: "summary" | "refine" | "map";
}): string {
  const { config, hasSources, mode } = params;
  const instructions = [
    resolveFormatInstruction(config.outputFormat),
    resolveLengthInstruction(config),
    resolveStructureInstruction(config.preserveStructure),
    resolveFocusInstruction(config.focusAreas),
    resolveEntityInstruction(config.extractEntities),
    config.language ? `Write in ${config.language}.` : null,
    resolveCitationInstruction(hasSources, config.citationStyle),
    config.customInstructions?.trim() ? config.customInstructions.trim() : null,
  ]
    .filter((instruction): instruction is string => Boolean(instruction))
    .map((instruction) => `- ${instruction}`)
    .join("\n");

  let task = "Summarize the content.";
  if (mode === "refine") {
    task = "Update the existing summary using new content.";
  } else if (mode === "map") {
    task = "Summarize the content for later synthesis.";
  }

  return `<role>
You are an enterprise summarization assistant.
</role>

<task>
${task}
</task>

<instructions>
${instructions}
</instructions>`;
}

function buildSummaryPrompt(
  config: SummarizeNodeConfig,
  hasSources: boolean
): string {
  return `${buildPromptBase({ config, hasSources, mode: "summary" })}

<output_format>
Return a JSON object:
{
  "summary": "string",
  "key_points": ["string"],
  "action_items": [{"task": "string", "assignee": "string?", "dueDate": "string?"}],
  "entities": [{"text": "string", "type": "string", "count": number}]
}
Use empty arrays when a section has no items.
</output_format>`;
}

function buildMapPrompt(config: SummarizeNodeConfig): string {
  return `${buildPromptBase({ config, hasSources: false, mode: "map" })}

<output_format>
Plain text only.
</output_format>`;
}

function buildRefinePrompt(
  config: SummarizeNodeConfig,
  hasSources: boolean
): string {
  return `${buildPromptBase({ config, hasSources, mode: "refine" })}

<output_format>
Return the same JSON schema as the existing summary.
</output_format>`;
}

function buildSourceContext(sources: SummarySource[]): string {
  const blocks = sources.map((source, index) => {
    const id = index + 1;
    return `<source id="${id}" title="${source.title}">
${source.snippet}
</source>`;
  });
  return blocks.join("\n\n");
}

function buildUserContent(params: {
  text: string;
  sources: SummarySource[];
  includeSources: boolean;
}): string {
  if (!params.includeSources || params.sources.length === 0) {
    return `<content>
${params.text}
</content>`;
  }
  return `<sources>
${buildSourceContext(params.sources)}
</sources>`;
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
  return null;
}

function parseKeyPoints(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseActionItems(value: unknown): ActionItem[] {
  let items: unknown[] = [];
  if (Array.isArray(value)) {
    items = value;
  } else if (value) {
    items = [value];
  }
  const results: ActionItem[] = [];

  for (const item of items) {
    const parsed = ActionItemSchema.safeParse(item);
    if (parsed.success) {
      results.push(parsed.data);
      continue;
    }
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (trimmed) {
        results.push({ task: trimmed });
      }
      continue;
    }
    if (isRecord(item) && typeof item.task === "string") {
      const task = item.task.trim();
      if (!task) {
        continue;
      }
      results.push({
        task,
        assignee:
          typeof item.assignee === "string" ? item.assignee.trim() : undefined,
        dueDate:
          typeof item.dueDate === "string" ? item.dueDate.trim() : undefined,
      });
    }
  }

  return results;
}

function parseEntities(value: unknown): ExtractedEntity[] {
  let items: unknown[] = [];
  if (Array.isArray(value)) {
    items = value;
  } else if (value) {
    items = [value];
  }
  const results: ExtractedEntity[] = [];

  for (const item of items) {
    const parsed = ExtractedEntitySchema.safeParse(item);
    if (parsed.success) {
      results.push(parsed.data);
      continue;
    }
    if (!isRecord(item)) {
      continue;
    }
    if (typeof item.text !== "string" || typeof item.type !== "string") {
      continue;
    }
    const text = item.text.trim();
    const type = item.type.trim();
    if (!(text && type)) {
      continue;
    }
    let count = 1;
    if (typeof item.count === "number" && Number.isFinite(item.count)) {
      count = item.count;
    } else if (typeof item.count === "string") {
      const trimmed = item.count.trim();
      if (trimmed && Number.isFinite(Number(trimmed))) {
        count = Number(trimmed);
      }
    }
    results.push({ text, type, count });
  }

  return results;
}

function parseSummaryOutput(text: string): SummaryOutput {
  const candidate = extractJsonCandidate(text);
  if (!candidate) {
    const trimmed = normalizeWhitespace(text);
    return {
      summary: trimmed || DEFAULT_SUMMARY_TEXT,
      keyPoints: [],
      actionItems: [],
      entities: [],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    const trimmed = normalizeWhitespace(text);
    return {
      summary: trimmed || DEFAULT_SUMMARY_TEXT,
      keyPoints: [],
      actionItems: [],
      entities: [],
    };
  }

  const strict = ModelOutputSchema.safeParse(parsed);
  if (strict.success) {
    return {
      summary: normalizeWhitespace(strict.data.summary),
      keyPoints: strict.data.key_points ?? [],
      actionItems: strict.data.action_items ?? [],
      entities: strict.data.entities ?? [],
    };
  }

  if (!isRecord(parsed)) {
    const trimmed = normalizeWhitespace(text);
    return {
      summary: trimmed || DEFAULT_SUMMARY_TEXT,
      keyPoints: [],
      actionItems: [],
      entities: [],
    };
  }

  let summaryValue = "";
  if (typeof parsed.summary === "string") {
    summaryValue = parsed.summary;
  } else if (typeof parsed.summaryText === "string") {
    summaryValue = parsed.summaryText;
  }

  const keyPoints = parseKeyPoints(
    parsed.key_points ?? parsed.keyPoints ?? parsed.keypoints
  );
  const actionItems = parseActionItems(
    parsed.action_items ?? parsed.actionItems ?? parsed.actionitems
  );
  const entities = parseEntities(parsed.entities);

  return {
    summary: normalizeWhitespace(summaryValue) || DEFAULT_SUMMARY_TEXT,
    keyPoints,
    actionItems,
    entities,
  };
}

function normalizeKeyPoints(points: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const point of points) {
    const trimmed = point.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

function normalizeActionItems(items: ActionItem[]): ActionItem[] {
  return items
    .map((item) => ({
      task: item.task.trim(),
      assignee: item.assignee?.trim(),
      dueDate: item.dueDate?.trim(),
    }))
    .filter((item) => item.task);
}

function normalizeEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
  const result: ExtractedEntity[] = [];
  const seen = new Set<string>();
  for (const entity of entities) {
    const text = entity.text.trim();
    const type = entity.type.trim();
    if (!(text && type)) {
      continue;
    }
    const key = `${text.toLowerCase()}:${type.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({
      text,
      type,
      count: entity.count,
    });
  }
  return result;
}

function normalizeSummaryOutput(output: SummaryOutput): SummaryOutput {
  return {
    summary: output.summary.trim() || DEFAULT_SUMMARY_TEXT,
    keyPoints: normalizeKeyPoints(output.keyPoints),
    actionItems: normalizeActionItems(output.actionItems),
    entities: normalizeEntities(output.entities),
  };
}

function applyWordLimit(text: string, maxWords: number): string {
  const words = text.split(WHITESPACE).filter(Boolean);
  if (words.length <= maxWords) {
    return text.trim();
  }
  return words.slice(0, maxWords).join(" ").trim();
}

function aggregateUsage(total: SummaryUsage, next: SummaryUsage): SummaryUsage {
  return {
    inputTokens: total.inputTokens + next.inputTokens,
    outputTokens: total.outputTokens + next.outputTokens,
  };
}

function resolveStrategy(
  config: SummarizeNodeConfig,
  tokenCount: number
): SummarizationStrategy {
  if (config.strategy !== "auto") {
    return config.strategy;
  }
  if (tokenCount <= config.chunkSize) {
    return "stuff";
  }
  if (tokenCount <= config.chunkSize * 2) {
    return "refine";
  }
  return "map_reduce";
}

function splitTextIntoChunks(
  text: string,
  chunkSize: number,
  chunkOverlap: number
): string[] {
  const paragraphs = text
    .split(PARAGRAPH_SPLIT)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  const pushChunk = () => {
    if (current.length === 0) {
      return;
    }
    const chunkText = current.join("\n\n").trim();
    if (chunkText) {
      chunks.push(chunkText);
    }
    if (chunkOverlap > 0) {
      const overlapText = takeOverlap(chunkText, chunkOverlap);
      current = overlapText ? [overlapText] : [];
      currentTokens = overlapText ? estimateTokens(overlapText) : 0;
    } else {
      current = [];
      currentTokens = 0;
    }
  };

  const addSegment = (segment: string) => {
    const segmentTokens = estimateTokens(segment);
    if (currentTokens + segmentTokens > chunkSize && currentTokens > 0) {
      pushChunk();
    }
    current.push(segment);
    currentTokens += segmentTokens;
  };

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);
    if (paragraphTokens <= chunkSize) {
      addSegment(paragraph);
      continue;
    }
    const sentences = paragraph
      .split(SENTENCE_SPLIT)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    for (const sentence of sentences) {
      addSegment(sentence);
    }
  }

  pushChunk();
  return chunks;
}

function takeOverlap(text: string, overlapTokens: number): string {
  if (!text.trim()) {
    return "";
  }
  const words = text.split(WHITESPACE).filter(Boolean);
  if (words.length <= overlapTokens) {
    return text.trim();
  }
  return words
    .slice(words.length - overlapTokens)
    .join(" ")
    .trim();
}

async function runCompletion(
  content: string,
  options: CompletionOptions
): Promise<{ content: string; usage: SummaryUsage }> {
  const result = await complete([{ role: "user", content }], options);
  return {
    content: result.content ?? "",
    usage: {
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    },
  };
}

async function summarizeStructured(params: {
  content: string;
  prompt: string;
  options: CompletionOptions;
}): Promise<{ output: SummaryOutput; usage: SummaryUsage }> {
  const result = await runCompletion(params.content, {
    ...params.options,
    systemPrompt: params.prompt,
  });
  const parsed = normalizeSummaryOutput(parseSummaryOutput(result.content));
  return { output: parsed, usage: result.usage };
}

async function summarizeChunk(params: {
  content: string;
  prompt: string;
  options: CompletionOptions;
}): Promise<{ content: string; usage: SummaryUsage }> {
  return await runCompletion(params.content, {
    ...params.options,
    systemPrompt: params.prompt,
  });
}

async function summarizeMapReduce(params: {
  text: string;
  config: SummarizeNodeConfig;
  options: CompletionOptions;
  hasSources: boolean;
}): Promise<{
  output: SummaryOutput;
  usage: SummaryUsage;
  chunksProcessed: number;
}> {
  const chunks = splitTextIntoChunks(
    params.text,
    params.config.chunkSize,
    params.config.chunkOverlap
  );
  const mapPrompt = buildMapPrompt(params.config);
  let usage: SummaryUsage = { inputTokens: 0, outputTokens: 0 };
  const summaries: string[] = [];

  for (const chunk of chunks) {
    const result = await summarizeChunk({
      content: `<content>
${chunk}
</content>`,
      prompt: mapPrompt,
      options: params.options,
    });
    usage = aggregateUsage(usage, result.usage);
    const summaryText = normalizeWhitespace(result.content);
    if (summaryText) {
      summaries.push(summaryText);
    }
  }

  const reducedText = summaries.join("\n\n");
  const summaryPrompt = buildSummaryPrompt(params.config, params.hasSources);
  const structured = await summarizeStructured({
    content: `<content>
${reducedText}
</content>`,
    prompt: summaryPrompt,
    options: params.options,
  });
  usage = aggregateUsage(usage, structured.usage);

  return { output: structured.output, usage, chunksProcessed: chunks.length };
}

async function summarizeRefine(params: {
  text: string;
  config: SummarizeNodeConfig;
  options: CompletionOptions;
  hasSources: boolean;
}): Promise<{
  output: SummaryOutput;
  usage: SummaryUsage;
  chunksProcessed: number;
}> {
  const chunks = splitTextIntoChunks(
    params.text,
    params.config.chunkSize,
    params.config.chunkOverlap
  );
  const summaryPrompt = buildSummaryPrompt(params.config, params.hasSources);
  const refinePrompt = buildRefinePrompt(params.config, params.hasSources);

  let usage: SummaryUsage = { inputTokens: 0, outputTokens: 0 };
  let currentOutput = await summarizeStructured({
    content: `<content>
${chunks[0] ?? ""}
</content>`,
    prompt: summaryPrompt,
    options: params.options,
  });
  usage = aggregateUsage(usage, currentOutput.usage);

  for (const chunk of chunks.slice(1)) {
    const refined = await summarizeStructured({
      content: `<existing_summary>
${JSON.stringify({
  summary: currentOutput.output.summary,
  key_points: currentOutput.output.keyPoints,
  action_items: currentOutput.output.actionItems,
  entities: currentOutput.output.entities,
})}
</existing_summary>

<new_content>
${chunk}
</new_content>`,
      prompt: refinePrompt,
      options: params.options,
    });
    usage = aggregateUsage(usage, refined.usage);
    currentOutput = refined;
  }

  return {
    output: currentOutput.output,
    usage,
    chunksProcessed: chunks.length,
  };
}

function buildExecutionResult(params: {
  output: SummaryOutput;
  config: SummarizeNodeConfig;
  usage: SummaryUsage;
  startedAt: number;
  strategyUsed: SummarizationStrategy;
  citations: Citation[];
  chunksProcessed?: number;
}): SummarizeExecutionResult {
  const latencyMs = Date.now() - params.startedAt;
  const maxWords = resolveWordLimit(params.config);
  const summary = applyWordLimit(params.output.summary, maxWords);
  const result: SummarizeExecutionResult = {
    summary,
    format: params.config.outputFormat,
    usage: {
      inputTokens: params.usage.inputTokens,
      outputTokens: params.usage.outputTokens,
      latencyMs,
      chunksProcessed: params.chunksProcessed,
    },
    strategyUsed: params.strategyUsed,
  };

  if (params.output.keyPoints.length > 0) {
    result.keyPoints = params.output.keyPoints;
  }
  if (params.output.actionItems.length > 0) {
    result.actionItems = params.output.actionItems;
  }
  if (params.output.entities.length > 0) {
    result.entities = params.output.entities;
  }
  if (params.config.includeCitations && params.citations.length > 0) {
    result.citations = params.citations;
  }

  return result;
}

export const summarizeExecutor: CanvasNodeExecutor = async ({
  node,
  input,
}) => {
  const config = SummarizeNodeConfigSchema.parse(resolveNodeConfig(node.data));
  const startedAt = Date.now();

  try {
    const summaryInput = resolveSummaryInput(input);
    if (!summaryInput.text.trim()) {
      throw new Error("Summarize input is required");
    }

    const tokenCount = estimateTokens(summaryInput.text);
    const strategyUsed = resolveStrategy(config, tokenCount);
    const model = resolveModel(config.model);
    const options: CompletionOptions = {
      providerId: model.providerId,
      modelId: model.modelId,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    };
    const hasSources =
      config.includeCitations && summaryInput.sources.length > 0;
    const citations =
      config.includeCitations && summaryInput.citations.length > 0
        ? summaryInput.citations
        : buildCitationsFromSources(summaryInput.sources);

    if (strategyUsed === "map_reduce") {
      const result = await summarizeMapReduce({
        text: summaryInput.text,
        config,
        options,
        hasSources,
      });
      return buildExecutionResult({
        output: result.output,
        config,
        usage: result.usage,
        startedAt,
        strategyUsed,
        citations,
        chunksProcessed: result.chunksProcessed,
      });
    }

    if (strategyUsed === "refine") {
      const result = await summarizeRefine({
        text: summaryInput.text,
        config,
        options,
        hasSources,
      });
      return buildExecutionResult({
        output: result.output,
        config,
        usage: result.usage,
        startedAt,
        strategyUsed,
        citations,
        chunksProcessed: result.chunksProcessed,
      });
    }

    const prompt = buildSummaryPrompt(config, hasSources);
    const result = await summarizeStructured({
      content: buildUserContent({
        text: summaryInput.text,
        sources: summaryInput.sources,
        includeSources: hasSources,
      }),
      prompt,
      options,
    });

    return buildExecutionResult({
      output: result.output,
      config,
      usage: result.usage,
      startedAt,
      strategyUsed,
      citations,
    });
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
