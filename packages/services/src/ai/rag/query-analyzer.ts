import type {
  ConversationContext,
  ExtractedEntity,
  QueryAnalysis,
  QueryIntent,
  TemporalContext,
} from "./types";

const QUESTION_INDICATORS = new Set([
  "what",
  "why",
  "how",
  "when",
  "where",
  "who",
  "which",
  "can",
  "could",
  "would",
  "should",
  "does",
  "do",
  "is",
  "are",
  "tell",
  "explain",
  "describe",
]);

const FOLLOWUP_INDICATORS = [
  "also",
  "and",
  "additionally",
  "furthermore",
  "what about",
  "how about",
  "regarding that",
  "more about",
  "expand on",
  "elaborate",
];

const CLARIFICATION_INDICATORS = [
  "i meant",
  "i mean",
  "no,",
  "not that",
  "actually",
  "sorry",
  "let me rephrase",
  "to clarify",
];

const PRONOUN_PATTERN =
  /\b(it|this|that|they|them|those|these|he|she|him|her)\b/i;

const WHITESPACE = /\s+/;
const MULTI_SPACE = /\s+/g;
const SMART_DOUBLE_QUOTES = /[""]/g;
const SMART_SINGLE_QUOTES = /['']/g;
const QUERY_DECOMPOSITION = /\s+(?:and|also|as well as|plus)\s+/i;
const MENTION_PATTERN = /@(\w+)/g;

interface TemporalPattern {
  pattern: RegExp;
  extract: (match: RegExpMatchArray) => TemporalContext;
}

const TEMPORAL_PATTERNS: TemporalPattern[] = [
  {
    pattern: /\b(last|past)\s+(\d+)\s+(day|week|month|year)s?\b/i,
    extract: (match) => {
      const amountStr = match[2] ?? "1";
      const unitStr = match[3] ?? "day";
      const amount = Number.parseInt(amountStr, 10);
      const unit = unitStr.toLowerCase();
      const now = new Date();
      const start = new Date(now);

      if (unit === "day") {
        start.setDate(start.getDate() - amount);
      } else if (unit === "week") {
        start.setDate(start.getDate() - amount * 7);
      } else if (unit === "month") {
        start.setMonth(start.getMonth() - amount);
      } else if (unit === "year") {
        start.setFullYear(start.getFullYear() - amount);
      }

      return { type: "relative", start, end: now, description: match[0] };
    },
  },
  {
    pattern: /\b(this|current)\s+(week|month|quarter|year)\b/i,
    extract: (match) => {
      const unitStr = match[2] ?? "week";
      const unit = unitStr.toLowerCase();
      const now = new Date();
      const start = new Date(now);

      if (unit === "week") {
        start.setDate(start.getDate() - start.getDay());
      } else if (unit === "month") {
        start.setDate(1);
      } else if (unit === "quarter") {
        start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
      } else if (unit === "year") {
        start.setMonth(0, 1);
      }

      return { type: "relative", start, end: now, description: match[0] };
    },
  },
  {
    pattern: /\b(yesterday|today|tomorrow)\b/i,
    extract: (match) => {
      const wordStr = match[1] ?? "today";
      const word = wordStr.toLowerCase();
      const target = new Date();

      if (word === "yesterday") {
        target.setDate(target.getDate() - 1);
      } else if (word === "tomorrow") {
        target.setDate(target.getDate() + 1);
      }

      return {
        type: "relative",
        start: target,
        end: target,
        description: match[0],
      };
    },
  },
];

const TECH_PATTERNS = [
  /\b(kubernetes|k8s|docker|react|typescript|python|java|aws|gcp|azure)\b/gi,
  /\b(postgres|redis|mongodb|elasticsearch|kafka|vespa)\b/gi,
  /\b(github|gitlab|jira|confluence|notion|slack|linear|figma)\b/gi,
];

export function analyzeQuery(
  query: string,
  conversationContext?: ConversationContext
): QueryAnalysis {
  const normalizedQuery = normalizeQuery(query);
  const intent = classifyIntent(normalizedQuery, conversationContext);
  const entities = extractEntities(normalizedQuery);
  const temporalContext = extractTemporalContext(normalizedQuery);
  const subQueries = decomposeQuery(normalizedQuery, intent);
  const requiresContext =
    intent === "followup" ||
    intent === "clarification" ||
    PRONOUN_PATTERN.test(normalizedQuery);
  const confidence = computeConfidence(intent, entities, temporalContext);

  return {
    originalQuery: query,
    normalizedQuery,
    intent,
    subQueries,
    entities,
    temporalContext,
    requiresContext,
    confidence,
  };
}

function normalizeQuery(query: string): string {
  return query
    .trim()
    .replace(MULTI_SPACE, " ")
    .replace(SMART_DOUBLE_QUOTES, '"')
    .replace(SMART_SINGLE_QUOTES, "'");
}

function checkClarification(lower: string): boolean {
  return CLARIFICATION_INDICATORS.some((indicator) =>
    lower.startsWith(indicator)
  );
}

function checkFollowup(lower: string): boolean {
  return FOLLOWUP_INDICATORS.some((indicator) => lower.includes(indicator));
}

function classifyIntent(
  query: string,
  context?: ConversationContext
): QueryIntent {
  const lower = query.toLowerCase();

  if (context?.previousMessages.length) {
    if (checkClarification(lower)) {
      return "clarification";
    }
    if (checkFollowup(lower)) {
      return "followup";
    }
    if (PRONOUN_PATTERN.test(lower)) {
      return "followup";
    }
  }

  const firstWord = lower.split(WHITESPACE)[0];
  if (firstWord && QUESTION_INDICATORS.has(firstWord)) {
    return "question";
  }

  if (lower.endsWith("?")) {
    return "question";
  }

  return "search";
}

function extractEntities(query: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const seen = new Set<string>();

  const mentionMatches = query.matchAll(MENTION_PATTERN);
  for (const match of mentionMatches) {
    const text = match[1];
    if (text && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      entities.push({ text, type: "person", confidence: 0.9 });
    }
  }

  for (const pattern of TECH_PATTERNS) {
    pattern.lastIndex = 0;
    const techMatches = query.matchAll(pattern);
    for (const match of techMatches) {
      const text = match[1];
      if (text && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        entities.push({ text, type: "technology", confidence: 0.85 });
      }
    }
  }

  return entities;
}

function extractTemporalContext(query: string): TemporalContext | null {
  for (const { pattern, extract } of TEMPORAL_PATTERNS) {
    const match = query.match(pattern);
    if (match) {
      return extract(match);
    }
  }
  return null;
}

function decomposeQuery(query: string, intent: QueryIntent): string[] {
  if (intent !== "question") {
    return [query];
  }

  const parts = query
    .split(QUERY_DECOMPOSITION)
    .map((p) => p.trim())
    .filter((p) => p.length > 10);

  return parts.length > 1 ? parts : [query];
}

function computeConfidence(
  intent: QueryIntent,
  entities: ExtractedEntity[],
  temporal: TemporalContext | null
): number {
  let confidence = 0.5;

  if (intent === "question") {
    confidence += 0.2;
  }
  if (entities.length > 0) {
    confidence += 0.15;
  }
  if (temporal) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1);
}

export function enrichQueryWithContext(
  analysis: QueryAnalysis,
  context: ConversationContext
): string {
  if (!(analysis.requiresContext && context.previousMessages.length)) {
    return analysis.normalizedQuery;
  }

  let enrichedQuery = analysis.normalizedQuery;

  const entityName = context.entities.keys().next().value;
  if (entityName) {
    enrichedQuery = enrichedQuery
      .replace(/\bit\b/gi, entityName)
      .replace(/\bthis\b/gi, entityName)
      .replace(/\bthat\b/gi, entityName);
  }

  if (analysis.intent === "followup" && context.summary) {
    return `Context: ${context.summary}\n\nQuestion: ${enrichedQuery}`;
  }

  return enrichedQuery;
}
