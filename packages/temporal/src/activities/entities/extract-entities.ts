import { getConfig } from "@openbeam/ai";
import type { ExtractEntitiesInput, ExtractEntitiesOutput } from "./types";

const EXTRACTION_TIMEOUT_MS = 30_000;
const MAX_CONTENT_LENGTH = 50_000;

interface EngineEntityResponse {
  doc_id: string;
  entities: Array<{
    text: string;
    label: string;
    score: number;
    source: string;
  }>;
  entity_count: number;
}

export async function extractEntities(
  input: ExtractEntitiesInput
): Promise<ExtractEntitiesOutput> {
  const { documentId, title, content, author } = input;

  const config = getConfig();
  const engineUrl = config.engine.gpuURL;

  const response = await fetch(`${engineUrl}/v1/entities/extract/document`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      doc_id: documentId,
      title,
      content: content.slice(0, MAX_CONTENT_LENGTH),
      author,
    }),
    signal: AbortSignal.timeout(EXTRACTION_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Engine error: ${response.status} - ${errorText}`);
  }

  const result = (await response.json()) as EngineEntityResponse;

  return {
    documentId,
    entities: result.entities,
    entityCount: result.entity_count,
  };
}
