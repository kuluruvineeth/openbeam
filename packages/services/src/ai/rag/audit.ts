import { createHash } from "node:crypto";
import type { Database } from "@openbeam/db";
import type { RAGCitation } from "./types";

export interface RagAuditEntry {
  teamId: string;
  userId: string;
  query: string;
  sourcesUsed: string[];
  sourcesFiltered: string[];
  filterReasons?: Record<string, string>;
  answerLength: number;
  citationCount: number;
  accessControlIds: string[];
  surface: string;
  latencyMs: number;
}

function hashString(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function writeRagAuditLog(
  db: Database,
  entry: RagAuditEntry
): Promise<void> {
  try {
    await db.ragAuditLog.create({
      data: {
        teamId: entry.teamId,
        userId: entry.userId,
        query: entry.query,
        queryHash: hashString(entry.query.toLowerCase().trim()),
        sourcesUsed: entry.sourcesUsed,
        sourcesFiltered: entry.sourcesFiltered,
        filterReasons: entry.filterReasons ?? undefined,
        answerLength: entry.answerLength,
        citationCount: entry.citationCount,
        permissionSetHash: hashString(entry.accessControlIds.sort().join(",")),
        surface: entry.surface,
        latencyMs: entry.latencyMs,
      },
    });
  } catch {
    // Fire-and-forget — audit failure must not break RAG
  }
}

interface BuildAuditEntryOptions {
  teamId: string;
  userId: string;
  query: string;
  citations: RAGCitation[];
  filteredDocIds: string[];
  filterReasons: Map<string, string>;
  accessControlIds: string[];
  surface: string;
  answerLength: number;
  latencyMs: number;
}

export function buildAuditEntry(opts: BuildAuditEntryOptions): RagAuditEntry {
  return {
    teamId: opts.teamId,
    userId: opts.userId,
    query: opts.query,
    sourcesUsed: opts.citations.map((c) => c.documentId),
    sourcesFiltered: opts.filteredDocIds,
    filterReasons: Object.fromEntries(opts.filterReasons),
    answerLength: opts.answerLength,
    citationCount: opts.citations.length,
    accessControlIds: opts.accessControlIds,
    surface: opts.surface,
    latencyMs: opts.latencyMs,
  };
}
