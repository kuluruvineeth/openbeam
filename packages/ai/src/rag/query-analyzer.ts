import type {
  ConversationTurn,
  EntityType,
  ExtractedEntity,
  QueryAnalysis,
  QueryIntent,
  TemporalContext,
} from "@openbeam/types/ai";
import type { ConversationContext } from "./types";

const WHITESPACE = /\s+/;
const MULTI_SPACE = /\s+/g;
const SMART_DOUBLE_QUOTES = /[""]/g;
const SMART_SINGLE_QUOTES = /['']/g;
const QUERY_DECOMPOSITION = /\s+(?:and|also|as well as|plus)\s+/i;
const MENTION_PATTERN = /@(\w+)/g;
const PRONOUN_PATTERN =
  /\b(it|this|that|they|them|those|these|he|she|him|her)\b/i;

const QUESTION_STARTERS = new Set([
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

const COMPARISON_INDICATORS = [
  "compare",
  "difference between",
  "vs",
  "versus",
  "better than",
  "worse than",
  "similar to",
  "different from",
  "pros and cons",
  "which is better",
  "or",
];

const DEFINITION_INDICATORS = [
  "what is",
  "what are",
  "define",
  "definition of",
  "meaning of",
  "what does",
  "stand for",
  "acronym",
];

const HOWTO_INDICATORS = [
  "how to",
  "how do i",
  "how can i",
  "how should i",
  "steps to",
  "guide to",
  "tutorial",
  "instructions for",
  "process for",
  "procedure",
];

const COMMAND_INDICATORS = [
  "show me",
  "find",
  "search for",
  "get",
  "list",
  "give me",
  "fetch",
  "retrieve",
  "display",
  "pull up",
];

const FOLLOWUP_INDICATORS = [
  "also",
  "and what about",
  "additionally",
  "furthermore",
  "what about",
  "how about",
  "regarding that",
  "more about",
  "expand on",
  "elaborate",
  "tell me more",
  "go deeper",
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
  "what i meant was",
  "to be clear",
];

interface TemporalPattern {
  pattern: RegExp;
  extract: (match: RegExpMatchArray) => TemporalContext;
}

const TEMPORAL_PATTERNS: TemporalPattern[] = [
  {
    pattern: /\b(last|past)\s+(\d+)\s+(day|week|month|year)s?\b/i,
    extract: (match) => {
      const amount = Number.parseInt(match[2] ?? "1", 10);
      const unit = (match[3] ?? "day").toLowerCase();
      const now = new Date();
      const start = new Date(now);

      switch (unit) {
        case "day":
          start.setDate(start.getDate() - amount);
          break;
        case "week":
          start.setDate(start.getDate() - amount * 7);
          break;
        case "month":
          start.setMonth(start.getMonth() - amount);
          break;
        case "year":
          start.setFullYear(start.getFullYear() - amount);
          break;
        default:
          break;
      }

      return { type: "relative", start, end: now, description: match[0] };
    },
  },
  {
    pattern: /\b(this|current)\s+(week|month|quarter|year)\b/i,
    extract: (match) => {
      const unit = (match[2] ?? "week").toLowerCase();
      const now = new Date();
      const start = new Date(now);

      switch (unit) {
        case "week":
          start.setDate(start.getDate() - start.getDay());
          break;
        case "month":
          start.setDate(1);
          break;
        case "quarter":
          start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
          break;
        case "year":
          start.setMonth(0, 1);
          break;
        default:
          break;
      }

      return { type: "relative", start, end: now, description: match[0] };
    },
  },
  {
    pattern: /\b(yesterday|today|tomorrow)\b/i,
    extract: (match) => {
      const word = (match[1] ?? "today").toLowerCase();
      const target = new Date();

      switch (word) {
        case "yesterday":
          target.setDate(target.getDate() - 1);
          break;
        case "tomorrow":
          target.setDate(target.getDate() + 1);
          break;
        default:
          break;
      }

      return {
        type: "relative",
        start: target,
        end: target,
        description: match[0],
      };
    },
  },
  {
    pattern: /\b(before|after|since)\s+(\w+\s+\d{1,2}(?:,?\s+\d{4})?)\b/i,
    extract: (match) => {
      const modifier = (match[1] ?? "since").toLowerCase();
      const dateStr = match[2] ?? "";
      const parsed = new Date(dateStr);

      if (Number.isNaN(parsed.getTime())) {
        return { type: "relative", description: match[0] };
      }

      return modifier === "before"
        ? { type: "absolute", end: parsed, description: match[0] }
        : { type: "absolute", start: parsed, description: match[0] };
    },
  },
];

interface EntityPattern {
  pattern: RegExp;
  type: EntityType;
  confidence: number;
  normalize?: (text: string) => string;
}

const ENTITY_PATTERNS: EntityPattern[] = [
  {
    pattern:
      /\b(kubernetes|k8s|docker|react|vue|angular|typescript|javascript|python|java|rust|go|aws|gcp|azure|vercel)\b/gi,
    type: "technology",
    confidence: 0.9,
    normalize: (text) => {
      const normalizations: Record<string, string> = {
        k8s: "kubernetes",
        js: "javascript",
        ts: "typescript",
        py: "python",
      };
      return normalizations[text.toLowerCase()] ?? text;
    },
  },
  {
    pattern:
      /\b(postgres|postgresql|mysql|redis|mongodb|elasticsearch|kafka|vespa|prisma|drizzle)\b/gi,
    type: "technology",
    confidence: 0.9,
    normalize: (text) =>
      text.toLowerCase() === "postgres" ? "postgresql" : text,
  },
  {
    pattern:
      /\b(github|gitlab|jira|confluence|notion|slack|linear|figma|asana|trello|monday)\b/gi,
    type: "product",
    confidence: 0.85,
  },
  {
    pattern:
      /\b(google|microsoft|amazon|apple|meta|anthropic|openai|stripe|vercel|cloudflare)\b/gi,
    type: "organization",
    confidence: 0.8,
  },
  {
    pattern: /\b(q[1-4]\s*\d{4}|\d{4}\s*q[1-4])\b/gi,
    type: "date",
    confidence: 0.85,
  },
  {
    pattern:
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/gi,
    type: "date",
    confidence: 0.9,
  },
];

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "can",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "at",
  "by",
  "from",
  "as",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "under",
  "again",
  "further",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "and",
  "but",
  "if",
  "or",
  "because",
  "as",
  "until",
  "while",
  "about",
  "against",
  "between",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "up",
  "down",
  "out",
  "off",
  "over",
  "under",
  "again",
  "further",
  "then",
  "once",
  "i",
  "me",
  "my",
  "myself",
  "we",
  "our",
  "ours",
  "ourselves",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
  "he",
  "him",
  "his",
  "himself",
  "she",
  "her",
  "hers",
  "herself",
  "it",
  "its",
  "itself",
  "they",
  "them",
  "their",
  "theirs",
  "themselves",
  "what",
  "which",
  "who",
  "whom",
  "this",
  "that",
  "these",
  "those",
  "am",
  "are",
  "was",
  "were",
  "been",
  "being",
  "have",
  "has",
  "had",
  "having",
  "do",
  "does",
  "did",
  "doing",
  "would",
  "could",
  "should",
  "ought",
  "i'm",
  "you're",
  "he's",
  "she's",
  "it's",
  "we're",
  "they're",
  "i've",
  "you've",
  "we've",
  "they've",
  "i'd",
  "you'd",
  "he'd",
  "she'd",
  "we'd",
  "they'd",
  "i'll",
  "you'll",
  "he'll",
  "she'll",
  "we'll",
  "they'll",
  "isn't",
  "aren't",
  "wasn't",
  "weren't",
  "hasn't",
  "haven't",
  "hadn't",
  "doesn't",
  "don't",
  "didn't",
  "won't",
  "wouldn't",
  "shan't",
  "shouldn't",
  "can't",
  "cannot",
  "couldn't",
  "mustn't",
  "let's",
  "that's",
  "who's",
  "what's",
  "here's",
  "there's",
  "when's",
  "where's",
  "why's",
  "how's",
]);

export function analyzeQuery(
  query: string,
  conversationContext?: ConversationContext
): QueryAnalysis {
  const normalizedQuery = normalizeQuery(query);
  const intent = classifyIntent(normalizedQuery, conversationContext);
  const entities = extractEntities(normalizedQuery);
  const temporalContext = extractTemporalContext(normalizedQuery);
  const subQueries = decomposeQuery(normalizedQuery, intent);
  const keywords = extractKeywords(normalizedQuery, entities);
  const requiresContext = computeRequiresContext(
    intent,
    normalizedQuery,
    conversationContext
  );
  const confidence = computeConfidence(
    intent,
    entities,
    temporalContext,
    keywords
  );

  return {
    originalQuery: query,
    normalizedQuery,
    intent,
    subQueries,
    entities,
    temporalContext,
    requiresContext,
    confidence,
    keywords,
  };
}

function normalizeQuery(query: string): string {
  return query
    .trim()
    .replace(MULTI_SPACE, " ")
    .replace(SMART_DOUBLE_QUOTES, '"')
    .replace(SMART_SINGLE_QUOTES, "'");
}

function classifyIntent(
  query: string,
  context?: ConversationContext
): QueryIntent {
  const lower = query.toLowerCase();

  if (context?.turns.length) {
    if (matchesIndicators(lower, CLARIFICATION_INDICATORS, "startsWith")) {
      return "clarification";
    }
    if (matchesIndicators(lower, FOLLOWUP_INDICATORS, "includes")) {
      return "followup";
    }
    if (PRONOUN_PATTERN.test(lower)) {
      return "followup";
    }
  }

  if (matchesIndicators(lower, COMPARISON_INDICATORS, "includes")) {
    return "comparison";
  }

  if (matchesIndicators(lower, DEFINITION_INDICATORS, "startsWith")) {
    return "definition";
  }

  if (matchesIndicators(lower, HOWTO_INDICATORS, "startsWith")) {
    return "howto";
  }

  if (matchesIndicators(lower, COMMAND_INDICATORS, "startsWith")) {
    return "command";
  }

  const firstWord = lower.split(WHITESPACE)[0];
  if (firstWord && QUESTION_STARTERS.has(firstWord)) {
    return "question";
  }

  if (lower.endsWith("?")) {
    return "question";
  }

  return "search";
}

function matchesIndicators(
  text: string,
  indicators: string[],
  method: "startsWith" | "includes"
): boolean {
  return indicators.some((indicator) =>
    method === "startsWith"
      ? text.startsWith(indicator)
      : text.includes(indicator)
  );
}

function extractEntities(query: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const seen = new Set<string>();

  const mentionMatches = query.matchAll(MENTION_PATTERN);
  for (const match of mentionMatches) {
    const text = match[1];
    if (text && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      entities.push({ text, type: "person", confidence: 0.95 });
    }
  }

  for (const { pattern, type, confidence, normalize } of ENTITY_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = query.matchAll(pattern);
    for (const match of matches) {
      const text = match[1] ?? match[0];
      const lowerText = text.toLowerCase();
      if (!seen.has(lowerText)) {
        seen.add(lowerText);
        entities.push({
          text,
          type,
          confidence,
          normalized: normalize?.(text),
        });
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
  if (intent === "search" || intent === "command") {
    return [query];
  }

  const parts = query
    .split(QUERY_DECOMPOSITION)
    .map((p) => p.trim())
    .filter((p) => p.length > 10);

  return parts.length > 1 ? parts : [query];
}

function extractKeywords(query: string, entities: ExtractedEntity[]): string[] {
  const entityTexts = new Set(entities.map((e) => e.text.toLowerCase()));

  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(WHITESPACE)
    .filter(
      (word) =>
        word.length > 2 && !STOPWORDS.has(word) && !entityTexts.has(word)
    );

  const uniqueWords = [...new Set(words)];

  return uniqueWords.slice(0, 10);
}

function computeRequiresContext(
  intent: QueryIntent,
  query: string,
  context?: ConversationContext
): boolean {
  if (intent === "followup" || intent === "clarification") {
    return true;
  }

  if (PRONOUN_PATTERN.test(query)) {
    return true;
  }

  if (context?.turns.length && context.turns.length > 0) {
    const lastTurn = context.turns.at(-1);
    if (
      lastTurn &&
      lastTurn.role === "assistant" &&
      lastTurn.citations?.length
    ) {
      return true;
    }
  }

  return false;
}

function computeConfidence(
  intent: QueryIntent,
  entities: ExtractedEntity[],
  temporal: TemporalContext | null,
  keywords: string[]
): number {
  let confidence = 0.5;

  const intentBoosts: Record<QueryIntent, number> = {
    question: 0.2,
    definition: 0.25,
    comparison: 0.2,
    howto: 0.2,
    search: 0.1,
    command: 0.15,
    followup: 0.1,
    clarification: 0.1,
  };
  confidence += intentBoosts[intent] ?? 0;

  if (entities.length > 0) {
    confidence += Math.min(entities.length * 0.05, 0.15);
  }

  if (temporal) {
    confidence += 0.1;
  }

  if (keywords.length >= 3) {
    confidence += 0.05;
  }

  return Math.min(confidence, 1);
}

export function enrichQueryWithContext(
  analysis: QueryAnalysis,
  context: ConversationContext
): string {
  if (!analysis.requiresContext || context.turns.length === 0) {
    return analysis.normalizedQuery;
  }

  let enrichedQuery = analysis.normalizedQuery;

  const firstEntityKey = context.entities.keys().next().value as
    | string
    | undefined;
  if (firstEntityKey) {
    enrichedQuery = enrichedQuery
      .replace(/\bit\b/gi, firstEntityKey)
      .replace(/\bthis\b/gi, firstEntityKey)
      .replace(/\bthat\b/gi, firstEntityKey);
  }

  if (analysis.intent === "followup" && context.summary) {
    return `Context: ${context.summary}\n\nQuestion: ${enrichedQuery}`;
  }

  return enrichedQuery;
}

function extractEntitiesFromTurns(
  turns: ConversationTurn[]
): Map<string, ExtractedEntity> {
  const entities = new Map<string, ExtractedEntity>();

  for (const turn of turns) {
    if (turn.role === "user") {
      const analysis = analyzeQuery(turn.content);
      for (const entity of analysis.entities) {
        entities.set(entity.text.toLowerCase(), entity);
      }
    }
  }

  return entities;
}

function extractEntityNamesFromTurns(turns: ConversationTurn[]): Set<string> {
  const entityNames = new Set<string>();

  for (const turn of turns) {
    if (turn.role === "user") {
      const analysis = analyzeQuery(turn.content);
      for (const entity of analysis.entities) {
        entityNames.add(entity.text.toLowerCase());
      }
    }
  }

  return entityNames;
}

function detectTopicShift(turns: ConversationTurn[]): boolean {
  if (turns.length < 4) {
    return false;
  }

  const recentEntities = extractEntityNamesFromTurns(turns.slice(-2));
  const olderEntities = extractEntityNamesFromTurns(turns.slice(-4, -2));

  const overlap = [...recentEntities].filter((e) =>
    olderEntities.has(e)
  ).length;
  return overlap === 0 && recentEntities.size > 0;
}

export function buildConversationContext(
  conversationId: string,
  turns: ConversationTurn[]
): ConversationContext {
  return {
    conversationId,
    turns,
    summary: null,
    entities: extractEntitiesFromTurns(turns),
    topicShift: detectTopicShift(turns),
  };
}

export function summarizeTurns(turns: ConversationTurn[]): string {
  if (turns.length === 0) {
    return "";
  }

  const userQuestions = turns
    .filter((t) => t.role === "user")
    .map((t) => t.content);

  const topics = new Set<string>();
  for (const question of userQuestions) {
    const analysis = analyzeQuery(question);
    for (const entity of analysis.entities) {
      topics.add(entity.text);
    }
    for (const keyword of analysis.keywords.slice(0, 3)) {
      topics.add(keyword);
    }
  }

  const topicList = [...topics].slice(0, 5).join(", ");
  return `Conversation about: ${topicList}. Questions asked: ${userQuestions.length}.`;
}
