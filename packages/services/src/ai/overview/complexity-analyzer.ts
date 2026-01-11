export type QueryComplexity = "simple" | "moderate" | "complex";

interface ComplexitySignals {
  wordCount: number;
  hasMultipleClauses: boolean;
  hasComparison: boolean;
  hasNegation: boolean;
  hasTemporalReference: boolean;
  hasAggregation: boolean;
  questionType: "factual" | "procedural" | "analytical" | "opinion";
}

const COMPARISON_PATTERN =
  /\b(compar(e|ed|ing|ison)|versus|vs\.?|difference|better|worse|more|less|than)\b/i;
const NEGATION_PATTERN =
  /\b(not|don't|doesn't|isn't|aren't|never|without|except)\b/i;
const TEMPORAL_PATTERN =
  /\b(when|before|after|during|since|until|recent|latest|last|next)\b/i;
const AGGREGATION_PATTERN =
  /\b(all|every|total|sum|count|average|most|least|top|bottom)\b/i;
const ANALYTICAL_PATTERN = /\b(why|how|explain|analyze|evaluate|assess)\b/i;
const PROCEDURAL_PATTERN =
  /\b(how to|steps|process|procedure|guide|tutorial)\b/i;
const OPINION_PATTERN = /\b(opinion|think|feel|believe)\b/i;
const WHITESPACE_PATTERN = /\s+/;
const CLAUSE_SEPARATOR_PATTERN = /[,;]|\band\b|\bor\b|\bbut\b/i;

function extractSignals(query: string): ComplexitySignals {
  const words = query.split(WHITESPACE_PATTERN).filter(Boolean);
  const clauses = query.split(CLAUSE_SEPARATOR_PATTERN).filter(Boolean);

  const detectQuestionType = (): ComplexitySignals["questionType"] => {
    if (ANALYTICAL_PATTERN.test(query)) {
      return "analytical";
    }
    if (PROCEDURAL_PATTERN.test(query)) {
      return "procedural";
    }
    if (OPINION_PATTERN.test(query)) {
      return "opinion";
    }
    return "factual";
  };

  return {
    wordCount: words.length,
    hasMultipleClauses: clauses.length > 1,
    hasComparison: COMPARISON_PATTERN.test(query),
    hasNegation: NEGATION_PATTERN.test(query),
    hasTemporalReference: TEMPORAL_PATTERN.test(query),
    hasAggregation: AGGREGATION_PATTERN.test(query),
    questionType: detectQuestionType(),
  };
}

export function analyzeQueryComplexity(query: string): QueryComplexity {
  const signals = extractSignals(query);
  let score = 0;

  if (signals.wordCount > 15) {
    score += 2;
  } else if (signals.wordCount > 8) {
    score += 1;
  }

  if (signals.hasMultipleClauses) {
    score += 2;
  }
  if (signals.hasComparison) {
    score += 2;
  }
  if (signals.hasNegation) {
    score += 1;
  }
  if (signals.hasTemporalReference) {
    score += 1;
  }
  if (signals.hasAggregation) {
    score += 2;
  }

  if (signals.questionType === "analytical") {
    score += 3;
  } else if (signals.questionType === "procedural") {
    score += 2;
  } else if (signals.questionType === "opinion") {
    score += 1;
  }

  if (score <= 2) {
    return "simple";
  }
  if (score <= 5) {
    return "moderate";
  }
  return "complex";
}

interface ModelConfig {
  providerId: string;
  modelId: string;
}

const MODEL_BY_COMPLEXITY: Record<QueryComplexity, ModelConfig> = {
  simple: { providerId: "google", modelId: "gemini-2.5-flash-lite" },
  moderate: { providerId: "google", modelId: "gemini-2.5-flash" },
  complex: { providerId: "google", modelId: "gemini-3-flash-preview" },
};

export function selectModelForComplexity(
  complexity: QueryComplexity
): ModelConfig {
  return MODEL_BY_COMPLEXITY[complexity];
}
