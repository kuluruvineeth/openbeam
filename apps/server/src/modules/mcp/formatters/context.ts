import { relativeTime } from "./helpers";

type ContextEntry = {
  uri: string;
  abstract?: string | null;
  overview?: string | null;
  contextType?: string | null;
  category?: string | null;
  updatedAt?: string | null;
};

type ContextDetail = ContextEntry & {
  content?: string | null;
  parentUri?: string | null;
  ownerType?: string | null;
  activeCount?: number | null;
  relations?: Array<{ targetUri: string; reason?: string | null }> | null;
};

type AnswerResult = {
  answer: string;
  confidence?: number | null;
  citations?: Array<{
    uri?: string | null;
    title?: string | null;
    snippet?: string | null;
    source?: string | null;
  }> | null;
};

export function formatContextSearch(
  query: string,
  entries: ContextEntry[]
): string {
  if (entries.length === 0) {
    return `No context entries found for "${query}".`;
  }

  const rows = entries.map((e) => {
    const type = e.contextType ?? "unknown";
    const cat = e.category ? ` (${e.category})` : "";
    const summary = e.abstract ?? "(no summary)";
    return `• [${type}${cat}] ${e.uri}\n  ${summary}`;
  });

  return [
    `Found ${entries.length} context entries for "${query}":`,
    "",
    rows.join("\n\n"),
    "",
    "To read full content: use context_read with the URI.",
  ].join("\n");
}

export function formatContextDetail(e: ContextDetail): string {
  const parts: string[] = [
    `URI: ${e.uri}`,
    `Type: ${e.contextType ?? "unknown"}${e.category ? ` / ${e.category}` : ""}`,
    `Updated: ${relativeTime(e.updatedAt)}`,
  ];

  if (e.activeCount != null) {
    parts.push(`Access count: ${e.activeCount}`);
  }

  if (e.abstract) {
    parts.push(`\nSummary: ${e.abstract}`);
  }

  if (e.content) {
    const preview =
      e.content.length > 500 ? `${e.content.slice(0, 500)}...` : e.content;
    parts.push(`\nContent:\n${preview}`);
  }

  if (e.relations && e.relations.length > 0) {
    parts.push("\nRelated:");
    for (const r of e.relations) {
      parts.push(`  → ${r.targetUri}${r.reason ? ` (${r.reason})` : ""}`);
    }
  }

  return parts.join("\n");
}

export function formatAnswer(r: AnswerResult): string {
  const parts: string[] = [r.answer];

  if (r.citations && r.citations.length > 0) {
    parts.push("\nSources:");
    for (const [i, c] of r.citations.entries()) {
      const title = c.title ?? "Untitled";
      const source = c.source ? ` (${c.source})` : "";
      parts.push(`[${i + 1}] ${title}${source}`);
      if (c.snippet) {
        parts.push(
          `    ${c.snippet.slice(0, 120)}${c.snippet.length > 120 ? "..." : ""}`
        );
      }
    }
  }

  if (r.confidence != null) {
    const pct = Math.round(r.confidence * 100);
    parts.push(`\nConfidence: ${pct}%`);
  }

  return parts.join("\n");
}
