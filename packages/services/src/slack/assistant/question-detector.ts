import type { QuestionAnalysis, QuestionType } from "./types";

const QUESTION_WORDS = [
  "what",
  "how",
  "why",
  "where",
  "when",
  "who",
  "which",
  "can",
  "could",
  "would",
  "should",
  "is",
  "are",
  "does",
  "do",
  "will",
  "has",
  "have",
] as const;

const QUESTION_PATTERNS: readonly RegExp[] = [
  /^(what|how|why|where|when|who|which)\b/i,
  /\?[\s]*$/,
  /^(can|could|would|should|is|are|does|do|will|has|have)\s+(you|we|i|someone|anyone|it|they|there)\b/i,
  /\b(anyone|anybody)\s+(know|have|seen|heard)\b/i,
  /\bdoes\s+anyone\b/i,
  /\bhow\s+do\s+(i|we|you)\b/i,
  /\bwhat('s|\s+is)\s+the\b/i,
  /\bwhere\s+(can|do|is|are)\b/i,
  /\bis\s+there\s+(a|an|any)\b/i,
  /\bhelp\s+(me|us)\b/i,
];

const QUESTION_WORD_MAP: Record<string, QuestionType> = {
  what: "what",
  how: "how",
  why: "why",
  where: "where",
  when: "when",
  who: "who",
  which: "which",
};

const QUESTION_MARK_PATTERN = /\?[\s]*$/;
const WHITESPACE_PATTERN = /\s+/;
const COMMAND_CODE_PATTERN = /^[/$!]/;
const CODE_BLOCK_PATTERN = /```/;
const GREETING_PATTERN = /^(hey|hi|hello)\s/i;
const MENTION_PATTERN = /<@[A-Z0-9]+>/gi;
const CHANNEL_REF_PATTERN = /<#[A-Z0-9]+\|([^>]+)>/gi;
const URL_WITH_TEXT_PATTERN = /<(https?:\/\/[^|>]+)\|([^>]+)>/gi;
const PLAIN_URL_PATTERN = /<(https?:\/\/[^>]+)>/gi;
const SPECIAL_MENTION_PATTERN = /<!([^>]+)>/gi;
const FORMATTING_PATTERN = /[*_~`]/g;

export function analyzeQuestion(text: string): QuestionAnalysis {
  const cleanText = stripSlackFormatting(text).trim();

  if (!cleanText || cleanText.length < 3) {
    return {
      isQuestion: false,
      confidence: 0,
      extractedQuery: cleanText,
    };
  }

  let confidence = 0;
  let questionType: QuestionType | undefined;

  if (QUESTION_MARK_PATTERN.test(cleanText)) {
    confidence += 0.4;
  }

  for (const pattern of QUESTION_PATTERNS) {
    if (pattern.test(cleanText)) {
      confidence += 0.25;
      break;
    }
  }

  const words = cleanText.toLowerCase().split(WHITESPACE_PATTERN);
  const firstWord = words[0];

  if (
    firstWord &&
    QUESTION_WORDS.includes(firstWord as (typeof QUESTION_WORDS)[number])
  ) {
    confidence += 0.2;
    questionType = QUESTION_WORD_MAP[firstWord] ?? "general";
  }

  if (cleanText.length < 15) {
    confidence *= 0.7;
  }

  if (
    COMMAND_CODE_PATTERN.test(cleanText) ||
    CODE_BLOCK_PATTERN.test(cleanText)
  ) {
    confidence *= 0.3;
  }

  if (GREETING_PATTERN.test(cleanText) && confidence > 0.2) {
    confidence += 0.1;
  }

  return {
    isQuestion: confidence >= 0.3,
    confidence: Math.min(confidence, 1),
    questionType,
    extractedQuery: cleanText,
  };
}

export function shouldAutoRespond(
  analysis: QuestionAnalysis,
  responseMode: string,
  confidenceThreshold = 0.5
): boolean {
  if (responseMode === "never" || responseMode === "mention_only") {
    return false;
  }

  if (responseMode === "always") {
    return analysis.isQuestion;
  }

  return analysis.isQuestion && analysis.confidence >= confidenceThreshold;
}

function stripSlackFormatting(text: string): string {
  return text
    .replace(MENTION_PATTERN, "")
    .replace(CHANNEL_REF_PATTERN, "#$1")
    .replace(URL_WITH_TEXT_PATTERN, "$2")
    .replace(PLAIN_URL_PATTERN, "$1")
    .replace(SPECIAL_MENTION_PATTERN, "@$1")
    .replace(FORMATTING_PATTERN, "")
    .trim();
}

export function extractMentionedUserIds(text: string): string[] {
  const matches = text.matchAll(MENTION_PATTERN);
  return Array.from(matches, (m) => m[1]).filter(Boolean) as string[];
}
