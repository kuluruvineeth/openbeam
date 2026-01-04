import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const extractEntitiesTool = defineTool({
  name: "extract_entities",
  description: `Extract named entities from text or documents.
Identifies people, organizations, locations, dates, and custom entity types.
Use for entity recognition, knowledge graph building, or query expansion.`,
  category: "data",
  deferLoading: true,
  searchKeywords: ["entities", "ner", "extract", "people", "organizations"],

  parameters: z.object({
    source: z
      .union([
        z.object({ text: z.string().describe("Raw text to analyze") }),
        z.object({
          documentId: z.string().describe("Document ID to extract from"),
        }),
      ])
      .describe("Source of text for entity extraction"),
    entityTypes: z
      .array(
        z.enum([
          "person",
          "organization",
          "location",
          "date",
          "product",
          "event",
          "custom",
        ])
      )
      .optional()
      .describe("Filter to specific entity types"),
    minConfidence: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.7)
      .describe("Minimum confidence threshold"),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    let textToAnalyze: string;

    if ("text" in params.source) {
      textToAnalyze = params.source.text;
    } else {
      const doc = await ctx.services.documents.get(params.source.documentId);
      if (!doc) {
        return failure(
          "NOT_FOUND",
          `Document not found: ${params.source.documentId}`
        );
      }
      if (doc.teamId !== ctx.teamId) {
        return failure("UNAUTHORIZED", "Document belongs to different team");
      }
      textToAnalyze = `${doc.title || ""} ${doc.content || ""}`;
    }

    const analysis = ctx.services.rag.analyzeQuery(textToAnalyze);

    let entities = analysis.entities.filter(
      (e) => e.confidence >= params.minConfidence
    );

    if (params.entityTypes && params.entityTypes.length > 0) {
      const allowedTypes = new Set(params.entityTypes);
      entities = entities.filter((e) =>
        allowedTypes.has(e.type as (typeof params.entityTypes)[number])
      );
    }

    return success(
      {
        entities: entities.map((e) => ({
          text: e.text,
          type: e.type,
          confidence: e.confidence,
        })),
        entityCount: entities.length,
        sourceLength: textToAnalyze.length,
      },
      {
        latencyMs: performance.now() - startTime,
        source: "entity-extractor",
      }
    );
  },
});
