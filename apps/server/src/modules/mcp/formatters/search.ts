import { num, numbered, plural, relativeTime } from "./helpers";

type SearchResult = {
  id: string;
  title?: string | null;
  snippet?: string | null;
  source?: string | null;
  connectorType?: string | null;
  documentType?: string | null;
  sourceName?: string | null;
  authorName?: string | null;
  authorEmail?: string | null;
  url?: string | null;
  score?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ConnectorFacet = {
  connectorType: string;
  documentCount: number;
};

type SearchMeta = {
  query: string;
  total: number;
  returned: number;
  queryTimeMs?: number;
  embeddingTimeMs?: number;
  ranking?: string;
  nextCursor?: string | null;
  connectorFacets?: ConnectorFacet[];
};

type PersonResult = {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  documentCount?: number;
};

type RecentResult = {
  id: string;
  title?: string | null;
  connectorType?: string | null;
  documentType?: string | null;
  authorName?: string | null;
  url?: string | null;
  createdAt?: string | null;
};

export function formatSearchResults(
  meta: SearchMeta,
  results: SearchResult[]
): string {
  if (results.length === 0) {
    return `No results found for "${meta.query}". Try broadening your search, removing filters, or checking if the relevant data has been synced.`;
  }

  const parts: string[] = [];

  const showing =
    meta.returned < meta.total
      ? `Showing ${meta.returned} of ${num(meta.total)}`
      : `Found ${num(meta.total)}`;
  parts.push(`${showing} results for "${meta.query}":`);

  if (meta.connectorFacets && meta.connectorFacets.length > 0) {
    const facetLine = meta.connectorFacets
      .slice(0, 6)
      .map((f) => `${f.connectorType} (${f.documentCount})`)
      .join(", ");
    parts.push(`Sources: ${facetLine}`);
  }

  if (meta.queryTimeMs !== undefined) {
    const timing = meta.embeddingTimeMs
      ? `${meta.queryTimeMs}ms (embedding: ${meta.embeddingTimeMs}ms)`
      : `${meta.queryTimeMs}ms`;
    parts.push(
      `Query time: ${timing}${meta.ranking ? ` · Ranking: ${meta.ranking}` : ""}`
    );
  }

  parts.push("");

  const rows = numbered(
    results.map((r) => {
      const lines: string[] = [];
      const type = r.documentType ?? "document";
      const source = r.sourceName
        ? `${type} in ${r.sourceName}`
        : `${type} from ${r.source ?? r.connectorType ?? "unknown"}`;
      const scoreTag = r.score != null ? ` (score: ${r.score.toFixed(3)})` : "";
      lines.push(`[${source}] ${r.title ?? "(untitled)"}${scoreTag}`);
      if (r.snippet) {
        const preview =
          r.snippet.length > 150 ? `${r.snippet.slice(0, 150)}...` : r.snippet;
        lines.push(`   ${preview}`);
      }
      const metaParts: string[] = [];
      if (r.authorName) {
        metaParts.push(
          r.authorEmail
            ? `by ${r.authorName} <${r.authorEmail}>`
            : `by ${r.authorName}`
        );
      }
      if (r.createdAt) {
        metaParts.push(`created ${relativeTime(r.createdAt)}`);
      }
      if (r.updatedAt) {
        metaParts.push(`updated ${relativeTime(r.updatedAt)}`);
      }
      if (metaParts.length > 0) {
        lines.push(`   ${metaParts.join(" · ")}`);
      }
      if (r.url) {
        lines.push(`   ${r.url}`);
      }
      return lines.join("\n");
    })
  );

  parts.push(rows);

  if (meta.nextCursor) {
    parts.push("");
    parts.push(
      `More results available — pass cursor "${meta.nextCursor}" to fetch the next page.`
    );
  }

  parts.push("");
  parts.push(
    [
      "Next steps:",
      "- Read full content: context_read with the document URI.",
      "- Ask a question about these results: ask_question with your query.",
      "- Find the author: search_people with their name.",
      "- Narrow results: add connectorTypes, documentTypes, authorIds, or date filters.",
      "- See recent activity: search_recent for the latest documents.",
    ].join("\n")
  );

  return parts.join("\n");
}

export function formatPeopleResults(
  people: PersonResult[],
  query: string
): string {
  if (people.length === 0) {
    return `No people found matching "${query}". Try a partial name, email address, or check connected directories.`;
  }

  const rows = numbered(
    people.map((p) => {
      const parts = [p.name ?? "Unknown"];
      if (p.email) {
        parts.push(`<${p.email}>`);
      }
      if (p.documentCount != null && p.documentCount > 0) {
        parts.push(`(${plural(p.documentCount, "document")})`);
      }
      return parts.join(" ");
    })
  );

  const hints = [
    "",
    "Next steps:",
    "- Find documents by a person: search_documents with their name or use authorIds filter.",
    "- Get team overview: team_info for team-level stats.",
  ].join("\n");

  return `Found ${plural(people.length, "person", "people")} matching "${query}":\n\n${rows}${hints}`;
}

export function formatRecentResults(
  results: RecentResult[],
  hours: number
): string {
  if (results.length === 0) {
    return `No documents created or updated in the last ${plural(hours, "hour")}. Try increasing the hours parameter or checking sync status with connector_list.`;
  }

  const parts: string[] = [];
  parts.push(
    `${plural(results.length, "document")} created or updated in the last ${plural(hours, "hour")}:`
  );
  parts.push("");

  const rows = numbered(
    results.map((r) => {
      const lines: string[] = [];
      const source = r.connectorType ?? "unknown";
      const type = r.documentType ?? "document";
      lines.push(`[${type} from ${source}] ${r.title ?? "(untitled)"}`);
      const meta: string[] = [];
      if (r.authorName) {
        meta.push(`by ${r.authorName}`);
      }
      if (r.createdAt) {
        meta.push(`created ${relativeTime(r.createdAt)}`);
      }
      if (meta.length > 0) {
        lines.push(`   ${meta.join(" · ")}`);
      }
      if (r.url) {
        lines.push(`   ${r.url}`);
      }
      return lines.join("\n");
    })
  );

  parts.push(rows);
  parts.push("");
  parts.push(
    [
      "Next steps:",
      "- Search for specific content: search_documents with a query.",
      "- Read full content: context_read with the document URI.",
      "- Check sync health: connector_list to see all connected sources.",
    ].join("\n")
  );

  return parts.join("\n");
}

export function formatSemanticResults(
  query: string,
  results: SearchResult[],
  total: number
): string {
  if (results.length === 0) {
    return `No semantic matches found for "${query}". Try rephrasing with more descriptive language, or use search_documents for keyword-based search.`;
  }

  const header = `Found ${num(total)} semantic matches for "${query}":`;

  const rows = numbered(
    results.map((r) => {
      const lines: string[] = [];
      const type = r.documentType ?? "document";
      const source = r.sourceName
        ? `${type} in ${r.sourceName}`
        : `${type} from ${r.source ?? r.connectorType ?? "unknown"}`;
      const scoreTag = r.score != null ? ` (score: ${r.score.toFixed(3)})` : "";
      lines.push(`[${source}] ${r.title ?? "(untitled)"}${scoreTag}`);
      if (r.snippet) {
        const preview =
          r.snippet.length > 150 ? `${r.snippet.slice(0, 150)}...` : r.snippet;
        lines.push(`   ${preview}`);
      }
      if (r.authorName || r.updatedAt) {
        const meta: string[] = [];
        if (r.authorName) {
          meta.push(`by ${r.authorName}`);
        }
        if (r.updatedAt) {
          meta.push(`updated ${relativeTime(r.updatedAt)}`);
        }
        lines.push(`   ${meta.join(" · ")}`);
      }
      if (r.url) {
        lines.push(`   ${r.url}`);
      }
      return lines.join("\n");
    })
  );

  const hints = [
    "Next steps:",
    "- Find similar documents: search_similar with a result's document ID.",
    "- Read full content: context_read with the document URI.",
    "- Try keyword search: search_documents if you need exact term matching.",
  ].join("\n");

  return `${header}\n\n${rows}\n\n${hints}`;
}

export function formatSimilarResults(
  sourceDocumentId: string,
  results: SearchResult[],
  total: number
): string {
  if (results.length === 0) {
    return `No similar documents found for document "${sourceDocumentId}". The source document may lack sufficient content for similarity matching.`;
  }

  const header = `Found ${num(total)} documents similar to "${sourceDocumentId}":`;

  const rows = numbered(
    results.map((r) => {
      const lines: string[] = [];
      const type = r.documentType ?? "document";
      const source = r.sourceName
        ? `${type} in ${r.sourceName}`
        : `${type} from ${r.source ?? r.connectorType ?? "unknown"}`;
      lines.push(`[${source}] ${r.title ?? "(untitled)"}`);
      if (r.snippet) {
        const preview =
          r.snippet.length > 150 ? `${r.snippet.slice(0, 150)}...` : r.snippet;
        lines.push(`   ${preview}`);
      }
      if (r.url) {
        lines.push(`   ${r.url}`);
      }
      return lines.join("\n");
    })
  );

  const hints = [
    "Next steps:",
    "- Read full content: context_read with the document URI.",
    "- Search deeper: search_semantic with a concept from these results.",
  ].join("\n");

  return `${header}\n\n${rows}\n\n${hints}`;
}

export function formatAuthorDocuments(
  authorId: string,
  query: string | null,
  results: SearchResult[],
  total: number
): string {
  if (results.length === 0) {
    const suffix = query ? ` matching "${query}"` : "";
    return `No documents found for author "${authorId}"${suffix}. Verify the author ID from search_people, or try a broader query.`;
  }

  const qualifier = query ? ` matching "${query}"` : "";
  const header = `Found ${num(total)} documents by author "${authorId}"${qualifier}:`;

  const rows = numbered(
    results.map((r) => {
      const lines: string[] = [];
      const type = r.documentType ?? "document";
      const source = r.sourceName
        ? `${type} in ${r.sourceName}`
        : `${type} from ${r.source ?? r.connectorType ?? "unknown"}`;
      lines.push(`[${source}] ${r.title ?? "(untitled)"}`);
      if (r.snippet) {
        const preview =
          r.snippet.length > 150 ? `${r.snippet.slice(0, 150)}...` : r.snippet;
        lines.push(`   ${preview}`);
      }
      if (r.updatedAt) {
        lines.push(`   updated ${relativeTime(r.updatedAt)}`);
      }
      if (r.url) {
        lines.push(`   ${r.url}`);
      }
      return lines.join("\n");
    })
  );

  const hints = [
    "Next steps:",
    "- Read full content: context_read with the document URI.",
    "- Find similar content: search_similar with a result's document ID.",
    "- Narrow results: search_by_author again with a query filter.",
  ].join("\n");

  return `${header}\n\n${rows}\n\n${hints}`;
}
