import type {
  BotResponse,
  Citation,
  ExpertItem,
  SearchResultItem,
} from "@openbeam/types/bot";

export function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
}

export function citationLabel(c: Citation): string {
  return `[${c.index}] ${c.title}`;
}

export function citationLine(c: Citation): string {
  return c.url
    ? `[${c.index}] ${c.title} — ${c.url}`
    : `[${c.index}] ${c.title}`;
}

export function resultSnippet(item: SearchResultItem, max = 150): string {
  return truncate(item.snippet || "", max);
}

export function expertSummary(e: ExpertItem): string {
  const skills = e.expertise.join(", ");
  const suffix = e.documentCount > 0 ? ` — ${e.documentCount} docs` : "";
  return `${skills}${suffix}`;
}

export function followUpLabels(response: BotResponse): string[] {
  return (response.followUps ?? []).slice(0, 3);
}

export function confidenceEmoji(confidence: number | undefined): string {
  if (confidence === undefined) {
    return "";
  }
  if (confidence >= 0.8) {
    return "";
  }
  if (confidence >= 0.5) {
    return "This may not be fully accurate. ";
  }
  return "I'm not very confident about this. ";
}

export function buildSourceLine(
  citations: Citation[],
  linkFn: (url: string, text: string) => string
): string {
  if (citations.length === 0) {
    return "";
  }
  const refs = citations
    .slice(0, 5)
    .map((c) => (c.url ? linkFn(c.url, `[${c.index}]`) : `[${c.index}]`))
    .join("  ");
  return `Sources: ${refs}`;
}
