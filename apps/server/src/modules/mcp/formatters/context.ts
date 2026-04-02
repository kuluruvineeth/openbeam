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
    "Next steps:",
    "• Read full content: context_read with the URI from above.",
    "• Ask a question grounded in these results: ask_question with your query.",
    "• Search documents: search_documents for broader results across all connectors.",
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

  parts.push("");
  parts.push("Next steps:");
  if (e.relations && e.relations.length > 0) {
    parts.push(
      "• Explore related entries: context_read with a related URI above."
    );
  }
  parts.push("• Search for more context: context_search with a related query.");
  parts.push("• Ask a question grounded in this content: ask_question.");
  parts.push(
    "• Find related documents: search_documents with keywords from this entry."
  );

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

  parts.push("");
  parts.push("Next steps:");
  if (r.citations && r.citations.length > 0) {
    parts.push(
      "• Read a cited source in full: context_read with the citation URI."
    );
  }
  parts.push(
    "• Search for more on this topic: search_documents with a related query."
  );
  parts.push("• Find experts: search_people with a relevant name or role.");

  return parts.join("\n");
}
