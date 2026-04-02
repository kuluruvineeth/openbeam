import { num, numbered, relativeTime } from "./helpers";

type SearchResult = {
  id: string;
  title?: string | null;
  snippet?: string | null;
  source?: string | null;
  connectorType?: string | null;
  documentType?: string | null;
  sourceName?: string | null;
  authorName?: string | null;
  url?: string | null;
  updatedAt?: string | null;
};

type PersonResult = {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export function formatSearchResults(
  query: string,
  results: SearchResult[],
  total: number
): string {
  if (results.length === 0) {
    return `No results found for "${query}". Try broadening your search or checking if the relevant data has been synced.`;
  }

  const header = `Found ${num(total)} results for "${query}":`;

  const rows = numbered(
    results.map((r) => {
      const parts: string[] = [];
      const type = r.documentType ?? "document";
      const source = r.sourceName
        ? `${type} in ${r.sourceName}`
        : `${type} from ${r.source ?? r.connectorType ?? "unknown"}`;
      parts.push(`[${source}] ${r.title ?? "(untitled)"}`);
      if (r.snippet) {
        const preview =
          r.snippet.length > 150 ? `${r.snippet.slice(0, 150)}...` : r.snippet;
        parts.push(`   ${preview}`);
      }
      if (r.authorName || r.updatedAt) {
        const meta: string[] = [];
        if (r.authorName) {
          meta.push(`by ${r.authorName}`);
        }
        if (r.updatedAt) {
          meta.push(`updated ${relativeTime(r.updatedAt)}`);
        }
        parts.push(`   ${meta.join(" · ")}`);
      }
      if (r.url) {
        parts.push(`   ${r.url}`);
      }
      return parts.join("\n");
    })
  );

  const hints = [
    "Next steps:",
    "• Read full content: context_read with the document URI.",
    "• Ask a question about these results: ask_question with your query.",
    "• Find the author: search_people with their name.",
    "• Search related context: context_search for deeper exploration.",
    "• Narrow results: search_documents again with more specific terms or filters.",
  ].join("\n");

  return `${header}\n\n${rows}\n\n${hints}`;
}

export function formatPeopleResults(people: PersonResult[]): string {
  if (people.length === 0) {
    return "No people found matching your query.";
  }

  const rows = numbered(
    people.map((p) => {
      const parts = [p.name ?? "Unknown"];
      if (p.email) {
        parts.push(`<${p.email}>`);
      }
      return parts.join(" ");
    })
  );

  const hints = [
    "",
    "Next steps:",
    "• Find documents by a person: search_documents with their name as query.",
    "• Get team overview: team_info for team-level stats.",
  ].join("\n");

  return `Found ${people.length} people:\n\n${rows}${hints}`;
}
