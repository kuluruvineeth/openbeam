import { z } from "zod";

export const DocumentElementSchema = z.object({
  type: z.string(),
  text: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type DocumentElement = z.infer<typeof DocumentElementSchema>;

export const DocumentChunkSchema = z.object({
  index: z.number(),
  text: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  page_number: z.number().optional(),
  page_end: z.number().optional(),
});

export type DocumentChunk = z.infer<typeof DocumentChunkSchema>;

export const ParseResponseSchema = z.object({
  filename: z.string(),
  mime_type: z.string().nullable(),
  elements: z.array(DocumentElementSchema),
  chunks: z
    .union([z.array(z.string()), z.array(DocumentChunkSchema)])
    .nullable(),
  metadata: z.record(z.string(), z.unknown()),
  text_length: z.number(),
  page_count: z.number().nullable(),
});

export type ParseResponse = z.infer<typeof ParseResponseSchema>;

export const ChunkResponseSchema = z.object({
  chunks: z.array(DocumentChunkSchema),
  total_chunks: z.number(),
  total_characters: z.number(),
});

export type ChunkResponse = z.infer<typeof ChunkResponseSchema>;

export const HealthResponseSchema = z.object({
  status: z.string(),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ParserStrategySchema = z.enum([
  "fast",
  "hi_res",
  "ocr_only",
  "auto",
]);

export type ParserStrategy = z.infer<typeof ParserStrategySchema>;

export const ParseOptionsSchema = z.object({
  chunk: z.boolean().optional(),
  maxChunkSize: z.number().optional(),
  overlap: z.number().optional(),
  strategy: ParserStrategySchema.optional(),
});

export type ParseOptions = z.infer<typeof ParseOptionsSchema>;

export const ChunkOptionsSchema = z.object({
  maxCharacters: z.number().optional(),
  overlap: z.number().optional(),
});

export type ChunkOptions = z.infer<typeof ChunkOptionsSchema>;

export const ParserInfoSchema = z.object({
  name: z.string(),
  mimes: z.array(z.string()),
  extensions: z.array(z.string()),
});

export type ParserInfo = z.infer<typeof ParserInfoSchema>;

export const SupportedTypesResponseSchema = z.object({
  mimes: z.array(z.string()),
  extensions: z.array(z.string()),
  parsers: z.array(ParserInfoSchema),
});

export type SupportedTypesResponse = z.infer<
  typeof SupportedTypesResponseSchema
>;

export const EngineClientOptionsSchema = z.object({
  timeout: z.number().optional(),
});

export type EngineClientOptions = z.infer<typeof EngineClientOptionsSchema>;
