import { type ProviderId, streamCompletion } from "@openplane/ai";
import { logger } from "../../lib/logger";

const OVERVIEW_SYSTEM_PROMPT = `You are an AI assistant providing concise, accurate overviews based on search results.

Your task is to synthesize information from the provided sources into a clear, helpful overview.

Guidelines:
- Be concise and direct. Front-load the most important information.
- Use inline citations like [1], [2] to reference sources.
- Every factual claim must be supported by a citation.
- If sources conflict, present both perspectives with citations.
- Do not make claims not supported by the provided sources.
- Use markdown formatting for readability (bullet points, bold for emphasis).
- Keep the response focused on answering the user's query.
- Aim for 2-4 paragraphs unless the topic requires more detail.

Format your response as a well-structured overview with citations.`;

const WARMUP_PREFIXES = [
  OVERVIEW_SYSTEM_PROMPT,
  `${OVERVIEW_SYSTEM_PROMPT}\n\nBased on the following sources, provide a concise overview answering:`,
  `${OVERVIEW_SYSTEM_PROMPT}\n\nSOURCES:\n[1]`,
];

interface WarmupConfig {
  prefixes: string[];
  providerId: ProviderId;
  modelId: string;
}

interface WarmupResult {
  successful: number;
  failed: number;
  errors: string[];
}

async function warmPrefix(
  prefix: string,
  providerId: ProviderId,
  modelId: string
): Promise<boolean> {
  try {
    for await (const chunk of streamCompletion(
      [{ role: "user", content: `${prefix}\n\n[WARMUP]` }],
      {
        providerId,
        modelId,
        maxTokens: 1,
        temperature: 0,
      }
    )) {
      if (chunk.type === "done") {
        break;
      }
    }
    return true;
  } catch (error) {
    logger.warn(
      { error, prefix: prefix.slice(0, 50) },
      "KV warmup prefix failed"
    );
    return false;
  }
}

export async function warmKVCache(config: WarmupConfig): Promise<WarmupResult> {
  const result: WarmupResult = {
    successful: 0,
    failed: 0,
    errors: [],
  };

  for (const prefix of config.prefixes) {
    const success = await warmPrefix(prefix, config.providerId, config.modelId);
    if (success) {
      result.successful += 1;
    } else {
      result.failed += 1;
      result.errors.push(`Failed to warm prefix: ${prefix.slice(0, 30)}...`);
    }
  }

  logger.info(
    { successful: result.successful, failed: result.failed },
    "KV cache warmup completed"
  );

  return result;
}

export function warmOverviewCache(): Promise<WarmupResult> {
  return warmKVCache({
    prefixes: WARMUP_PREFIXES,
    providerId: "google",
    modelId: "gemini-3-flash-preview",
  });
}

const ONE_HOUR_MS = 3_600_000;

export function scheduleKVWarmup(intervalMs = ONE_HOUR_MS): NodeJS.Timeout {
  warmOverviewCache().catch((error) => {
    logger.error({ error }, "Initial KV cache warmup failed");
  });

  return setInterval(() => {
    warmOverviewCache().catch((error) => {
      logger.error({ error }, "Scheduled KV cache warmup failed");
    });
  }, intervalMs);
}

export function getWarmupPrefixes(): string[] {
  return [...WARMUP_PREFIXES];
}
