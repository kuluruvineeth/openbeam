import type { Database } from "@openbeam/db";
import { findContextSession, upsertContextEntry } from "@openbeam/db";
import {
  buildMemoryUri,
  formatMessagesForExtraction,
  generateSlug,
  MEMORY_EXTRACTION_SYSTEM_PROMPT,
} from "@openbeam/services/context/memory-extractor";
import { generateEntryId, getParentUri } from "@openbeam/services/context/uri";
import { ExtractMemoriesInputSchema } from "@openbeam/types/temporal/workflows/context";
import { Context } from "@temporalio/activity";
import type { MemoryExtractionResult } from "./types";

export interface ExtractMemoriesDependencies {
  db: Database;
  completionService: {
    complete(
      messages: Array<{ role: string; content: string }>,
      options?: { maxTokens?: number }
    ): Promise<{ content: string }>;
  };
}

interface CandidateMemory {
  scope: "user" | "agent";
  category: string;
  abstractText: string;
  content: string;
}

const JSON_ARRAY_PATTERN = /\[[\s\S]*\]/;

function parseCandidates(text: string): CandidateMemory[] {
  const jsonMatch = text.match(JSON_ARRAY_PATTERN);
  if (!jsonMatch) {
    return [];
  }
  try {
    return JSON.parse(jsonMatch[0]) as CandidateMemory[];
  } catch {
    return [];
  }
}

export function createExtractMemoriesActivity(
  deps: ExtractMemoriesDependencies
) {
  return {
    async extractMemoriesFromSession(
      rawInput: unknown
    ): Promise<MemoryExtractionResult> {
      const input = ExtractMemoriesInputSchema.parse(rawInput);

      Context.current().heartbeat({
        stage: "loading-session",
        sessionId: input.sessionId,
      });

      const session = await findContextSession(deps.db, input.sessionId);
      if (!session || session.messages.length === 0) {
        return {
          memoriesCreated: 0,
          memoriesMerged: 0,
          memoriesSkipped: 0,
          categories: {},
        };
      }

      const transcript = formatMessagesForExtraction(
        session.messages.map((m) => ({
          id: m.id,
          sessionId: m.sessionId,
          role: m.role as "user" | "assistant" | "tool" | "system",
          content: m.content,
          parts: m.parts as object | undefined,
          tokenCount: m.tokenCount,
          createdAt: m.createdAt,
        }))
      );

      Context.current().heartbeat({
        stage: "calling-llm",
        sessionId: input.sessionId,
      });

      const response = await deps.completionService.complete([
        { role: "system", content: MEMORY_EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: transcript },
      ]);

      const candidates = parseCandidates(response.content);
      if (candidates.length === 0) {
        return {
          memoriesCreated: 0,
          memoriesMerged: 0,
          memoriesSkipped: 0,
          categories: {},
        };
      }

      let created = 0;
      const categories: Record<string, number> = {};

      for (let i = 0; i < candidates.length; i += 1) {
        const candidate = candidates[i];
        if (!candidate) {
          continue;
        }

        if (i % 10 === 0) {
          Context.current().heartbeat({
            stage: "storing-memories",
            progress: i,
            total: candidates.length,
          });
        }

        const ownerId =
          candidate.scope === "agent" && input.agentId
            ? input.agentId
            : input.userId;
        const slug = generateSlug(candidate.abstractText);
        const uri = buildMemoryUri({
          scope: candidate.scope,
          teamId: input.teamId,
          ownerId,
          category: candidate.category as Parameters<
            typeof buildMemoryUri
          >[0]["category"],
          slug,
        });
        const id = generateEntryId(input.teamId, uri);
        const parentUri = getParentUri(uri);

        await upsertContextEntry(deps.db, {
          id,
          uri,
          parentUri: parentUri ?? undefined,
          teamId: input.teamId,
          ownerId,
          ownerType: candidate.scope,
          contextType: "memory",
          category: candidate.category,
          isLeaf: true,
          abstractText: candidate.abstractText,
          content: candidate.content,
        });

        created += 1;
        categories[candidate.category] =
          (categories[candidate.category] ?? 0) + 1;
      }

      return {
        memoriesCreated: created,
        memoriesMerged: 0,
        memoriesSkipped: candidates.length - created,
        categories,
      };
    },
  };
}
