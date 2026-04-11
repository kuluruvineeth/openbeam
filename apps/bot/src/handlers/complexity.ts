type Complexity = "simple" | "moderate" | "complex";

interface ModelSelection {
  provider: string;
  modelId: string;
}

const COMPLEX_KEYWORDS =
  /\b(?:analyze|compare|synthesize|summarize|explain\s+why|break\s+down|evaluate|contrast|correlate)\b/i;
const MULTI_STEP_PATTERNS =
  /\b(?:first|then|after\s+that|next|finally|step\s+\d|and\s+then)\b/i;
const MODERATE_KEYWORDS =
  /\b(?:list|describe|outline|what\s+are|how\s+(?:does|do|can|to)|why\s+(?:does|do|is))\b/i;

const COMPLEX_WORD_THRESHOLD = 30;
const MODERATE_WORD_THRESHOLD = 10;
const WHITESPACE_RE = /\s+/;
const QUESTION_MARK_RE = /\?/g;

export function classifyComplexity(text: string): Complexity {
  const wordCount = text.split(WHITESPACE_RE).filter(Boolean).length;
  const questionCount = (text.match(QUESTION_MARK_RE) ?? []).length;

  const hasComplexKeywords = COMPLEX_KEYWORDS.test(text);
  const hasMultiStep = MULTI_STEP_PATTERNS.test(text);

  if (
    wordCount > COMPLEX_WORD_THRESHOLD ||
    questionCount > 1 ||
    hasMultiStep ||
    (hasComplexKeywords && wordCount > MODERATE_WORD_THRESHOLD)
  ) {
    return "complex";
  }

  if (
    wordCount > MODERATE_WORD_THRESHOLD ||
    hasComplexKeywords ||
    MODERATE_KEYWORDS.test(text)
  ) {
    return "moderate";
  }

  return "simple";
}

const MODEL_MAP: Record<Complexity, ModelSelection> = {
  simple: { provider: "anthropic", modelId: "claude-haiku-4-5" },
  moderate: { provider: "anthropic", modelId: "claude-sonnet-4-5" },
  complex: { provider: "anthropic", modelId: "claude-sonnet-4-5" },
};

export function selectModel(complexity: Complexity): ModelSelection {
  return MODEL_MAP[complexity];
}
