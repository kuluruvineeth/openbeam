import type { CitationMatch, ContextDocument, OverviewCitation } from "./types";

const CITATION_PATTERN = /\[(\d+)\]/g;
const SENTENCE_SPLIT_PATTERN = /[.!?]+/;

export function extractCitationsFromText(text: string): CitationMatch[] {
  const matches: CitationMatch[] = [];
  CITATION_PATTERN.lastIndex = 0;

  for (
    let match: RegExpExecArray | null = CITATION_PATTERN.exec(text);
    match !== null;
    match = CITATION_PATTERN.exec(text)
  ) {
    const indexStr = match[1];
    if (!indexStr) {
      continue;
    }
    const index = Number.parseInt(indexStr, 10);
    matches.push({
      index,
      documentId: "",
      startPosition: match.index,
      endPosition: match.index + match[0].length,
    });
  }

  CITATION_PATTERN.lastIndex = 0;
  return matches;
}

export function buildCitationMap(
  documents: ContextDocument[]
): Map<number, OverviewCitation> {
  const map = new Map<number, OverviewCitation>();

  documents.forEach((doc, idx) => {
    const citationIndex = idx + 1;
    const firstChunk = doc.chunks[0];
    const snippet = firstChunk
      ? firstChunk.text.slice(0, 200)
      : doc.content.slice(0, 200);

    map.set(citationIndex, {
      index: citationIndex,
      documentId: doc.id,
      title: doc.title,
      url: doc.url,
      snippet: snippet.trim(),
      connectorType: doc.connectorType,
      sourceType: doc.sourceType,
      relevanceScore: doc.score,
    });
  });

  return map;
}

export function resolveCitations(
  matches: CitationMatch[],
  citationMap: Map<number, OverviewCitation>
): OverviewCitation[] {
  const resolved: OverviewCitation[] = [];
  const seen = new Set<number>();

  for (const match of matches) {
    if (seen.has(match.index)) {
      continue;
    }

    const citation = citationMap.get(match.index);
    if (citation) {
      resolved.push(citation);
      seen.add(match.index);
    }
  }

  return resolved;
}

export function extractCitationsRealtime(
  content: string,
  citationMap: Map<number, OverviewCitation>,
  previouslySeen: Set<number>
): { newCitations: OverviewCitation[]; seenIndices: Set<number> } {
  const matches = extractCitationsFromText(content);
  const newCitations: OverviewCitation[] = [];
  const seenIndices = new Set(previouslySeen);

  for (const match of matches) {
    if (seenIndices.has(match.index)) {
      continue;
    }

    const citation = citationMap.get(match.index);
    if (citation) {
      newCitations.push(citation);
      seenIndices.add(match.index);
    }
  }

  return { newCitations, seenIndices };
}

export function formatCitationPrompt(documents: ContextDocument[]): string {
  const parts: string[] = [];

  documents.forEach((doc, idx) => {
    const citationNum = idx + 1;
    const content =
      doc.chunks.length > 0
        ? doc.chunks.map((c) => c.text).join("\n\n")
        : doc.content;

    parts.push(`[${citationNum}] ${doc.title}\n${content}`);
  });

  return parts.join("\n\n---\n\n");
}

export function calculateGroundingScore(
  content: string,
  citationMap: Map<number, OverviewCitation>
): number {
  const matches = extractCitationsFromText(content);
  const uniqueCitations = new Set(matches.map((m) => m.index));

  const sentences = content
    .split(SENTENCE_SPLIT_PATTERN)
    .filter((s) => s.trim().length > 20);
  if (sentences.length === 0) {
    return uniqueCitations.size > 0 ? 0.8 : 0.5;
  }

  let citedSentences = 0;
  for (const sentence of sentences) {
    const hasCitation = CITATION_PATTERN.test(sentence);
    CITATION_PATTERN.lastIndex = 0;
    if (hasCitation) {
      citedSentences += 1;
    }
  }

  const citationDensity = citedSentences / sentences.length;
  const sourceCoverage = Math.min(uniqueCitations.size / citationMap.size, 1);

  return citationDensity * 0.7 + sourceCoverage * 0.3;
}
