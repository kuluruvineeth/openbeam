/**
 * Web Tools
 *
 * Built-in tools for web-related operations.
 * Note: Actual implementation may require external APIs.
 */

import { z } from "zod";
import { defineTool } from "../registry";

/**
 * Current date/time tool
 */
const currentDateTimeParamsSchema = z.object({
  timezone: z
    .string()
    .optional()
    .default("UTC")
    .describe(
      "Timezone for the date/time (e.g., 'America/New_York', 'Europe/London')"
    ),
  format: z
    .enum(["iso", "human", "timestamp"])
    .optional()
    .default("human")
    .describe("Output format"),
});

type CurrentDateTimeParams = z.infer<typeof currentDateTimeParamsSchema>;

interface DateTimeResult {
  datetime: string;
  timezone: string;
  timestamp: number;
}

export const currentDateTimeTool = defineTool<
  CurrentDateTimeParams,
  DateTimeResult
>({
  name: "current_datetime",
  description:
    "Get the current date and time, optionally in a specific timezone.",
  parameters: currentDateTimeParamsSchema,
  category: "utility",
  parallelizable: true,

  async execute(params): Promise<DateTimeResult> {
    const now = new Date();
    const timestamp = now.getTime();

    let datetime: string;
    switch (params.format) {
      case "iso":
        datetime = now.toISOString();
        break;
      case "timestamp":
        datetime = String(timestamp);
        break;
      case "human":
      default:
        datetime = now.toLocaleString("en-US", {
          timeZone: params.timezone,
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZoneName: "short",
        });
    }

    return {
      datetime,
      timezone: params.timezone,
      timestamp,
    };
  },
});

/**
 * URL parser tool
 */
const parseUrlParamsSchema = z.object({
  url: z.string().url().describe("URL to parse"),
});

type ParseUrlParams = z.infer<typeof parseUrlParamsSchema>;

interface ParsedUrl {
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  searchParams: Record<string, string>;
}

export const parseUrlTool = defineTool<ParseUrlParams, ParsedUrl>({
  name: "parse_url",
  description:
    "Parse a URL into its components (protocol, host, path, query params, etc.).",
  parameters: parseUrlParamsSchema,
  category: "utility",
  parallelizable: true,

  async execute(params): Promise<ParsedUrl> {
    const url = new URL(params.url);

    const searchParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      searchParams[key] = value;
    });

    return {
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      searchParams,
    };
  },
});

/**
 * Text analysis tool
 */
const analyzeTextParamsSchema = z.object({
  text: z.string().describe("Text to analyze"),
});

type AnalyzeTextParams = z.infer<typeof analyzeTextParamsSchema>;

interface TextAnalysis {
  characterCount: number;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgWordsPerSentence: number;
  readingTimeMinutes: number;
}

export const analyzeTextTool = defineTool<AnalyzeTextParams, TextAnalysis>({
  name: "analyze_text",
  description:
    "Analyze text to get statistics like word count, sentence count, reading time, etc.",
  parameters: analyzeTextParamsSchema,
  category: "utility",
  parallelizable: true,

  async execute(params): Promise<TextAnalysis> {
    const text = params.text.trim();

    const characterCount = text.length;
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const sentenceCount = sentences.length;
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const paragraphCount = paragraphs.length;

    const avgWordsPerSentence =
      sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;
    const readingTimeMinutes = Math.ceil(wordCount / 200); // Avg 200 wpm

    return {
      characterCount,
      wordCount,
      sentenceCount,
      paragraphCount,
      avgWordsPerSentence,
      readingTimeMinutes,
    };
  },
});

/**
 * JSON validator tool
 */
const validateJsonParamsSchema = z.object({
  json: z.string().describe("JSON string to validate"),
});

type ValidateJsonParams = z.infer<typeof validateJsonParamsSchema>;

interface JsonValidation {
  valid: boolean;
  error?: string;
  parsed?: unknown;
}

export const validateJsonTool = defineTool<ValidateJsonParams, JsonValidation>({
  name: "validate_json",
  description:
    "Validate if a string is valid JSON and optionally return the parsed result.",
  parameters: validateJsonParamsSchema,
  category: "utility",
  parallelizable: true,

  async execute(params): Promise<JsonValidation> {
    try {
      const parsed = JSON.parse(params.json);
      return {
        valid: true,
        parsed,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Invalid JSON",
      };
    }
  },
});

export default {
  currentDateTime: currentDateTimeTool,
  parseUrl: parseUrlTool,
  analyzeText: analyzeTextTool,
  validateJson: validateJsonTool,
};
