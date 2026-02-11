import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

const DEFAULT_MAX_CONTENT_LENGTH = 10_000;

const ExaPageSchema = z.object({
  url: z.string(),
  title: z.string().optional().default(""),
  text: z.string().optional().default(""),
  publishedDate: z.string().optional(),
});

export const scrapePageTool = defineTool({
  name: "scrape_page",
  description: `Extract full text content from a specific URL. Use when you need the complete content of a known web page.

USE THIS WHEN:
- You have a specific URL and need its full content
- Following up on a search result to get more detail
- Extracting content from a known documentation page

DO NOT USE WHEN:
- You don't have a specific URL (use search_web first)
- You need internal documents (use doc_get)`,
  category: "search",
  deferLoading: false,
  searchKeywords: ["scrape", "extract", "page", "url", "content"],

  parameters: z.object({
    url: z.string().url().describe("URL of the page to scrape"),
    maxLength: z
      .number()
      .min(100)
      .max(50_000)
      .optional()
      .default(DEFAULT_MAX_CONTENT_LENGTH)
      .describe("Maximum content length in characters"),
  }),

  async execute(params, _ctx) {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      return failure("PROVIDER_ERROR", "Exa API key not configured", {
        retryable: false,
      });
    }

    const startMs = performance.now();

    const { default: Exa } = await import("exa-js");
    const exa = new Exa(apiKey);

    const response = await exa.getContents([params.url], {
      text: { maxCharacters: params.maxLength },
    });

    const raw = response.results[0];
    if (!raw) {
      return failure("NOT_FOUND", `No content retrieved from ${params.url}`);
    }

    const page = ExaPageSchema.parse(raw);
    const latencyMs = performance.now() - startMs;

    return success(
      {
        url: page.url,
        title: page.title,
        content: page.text,
        publishedDate: page.publishedDate,
      },
      { latencyMs, source: "exa" }
    );
  },
});
