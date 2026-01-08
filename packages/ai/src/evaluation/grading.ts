const JSON_EXTRACT_PATTERN = /\{[\s\S]*\}/;

export interface GradingRubric {
  accuracy: {
    weight: number;
    description: string;
  };
  grounding: {
    weight: number;
    description: string;
  };
  completeness: {
    weight: number;
    description: string;
  };
  clarity: {
    weight: number;
    description: string;
  };
}

export const DEFAULT_GRADING_RUBRIC: GradingRubric = {
  accuracy: {
    weight: 0.35,
    description: "Factual correctness of the response",
  },
  grounding: {
    weight: 0.3,
    description: "How well the response is supported by provided sources",
  },
  completeness: {
    weight: 0.2,
    description: "Whether all parts of the question are addressed",
  },
  clarity: {
    weight: 0.15,
    description: "Clear, well-structured, and easy to understand",
  },
};

export interface GradingResult {
  overallScore: number;
  scores: {
    accuracy: number;
    grounding: number;
    completeness: number;
    clarity: number;
  };
  feedback: string;
  passed: boolean;
  threshold: number;
}

export interface GradeRAGInput {
  question: string;
  context: string;
  response: string;
  expectedAnswer?: string;
  rubric?: GradingRubric;
  threshold?: number;
}

export function buildGradingPrompt(input: GradeRAGInput): string {
  const rubric = input.rubric ?? DEFAULT_GRADING_RUBRIC;

  return `<grading_task>
You are an expert evaluator grading AI-generated responses.

<question>
${input.question}
</question>

<context>
${input.context || "No context provided"}
</context>

<response_to_grade>
${input.response}
</response_to_grade>

${input.expectedAnswer ? `<expected_answer>\n${input.expectedAnswer}\n</expected_answer>` : ""}

<rubric>
Evaluate the response on these criteria (0.0 to 1.0 scale):

1. Accuracy (${rubric.accuracy.weight * 100}%): ${rubric.accuracy.description}
   - 1.0: Completely accurate, no errors
   - 0.7-0.9: Mostly accurate with minor issues
   - 0.4-0.6: Partially accurate with some errors
   - 0.0-0.3: Mostly inaccurate or misleading

2. Grounding (${rubric.grounding.weight * 100}%): ${rubric.grounding.description}
   - 1.0: All claims directly supported by context
   - 0.7-0.9: Most claims supported
   - 0.4-0.6: Some claims unsupported
   - 0.0-0.3: Response not based on context

3. Completeness (${rubric.completeness.weight * 100}%): ${rubric.completeness.description}
   - 1.0: Fully addresses all aspects of the question
   - 0.7-0.9: Addresses main points, minor omissions
   - 0.4-0.6: Partially addresses the question
   - 0.0-0.3: Largely incomplete or off-topic

4. Clarity (${rubric.clarity.weight * 100}%): ${rubric.clarity.description}
   - 1.0: Crystal clear and well-structured
   - 0.7-0.9: Clear with good structure
   - 0.4-0.6: Understandable but could be clearer
   - 0.0-0.3: Confusing or poorly organized
</rubric>

<output_format>
Provide your evaluation as JSON:
{
  "accuracy": <score 0.0-1.0>,
  "grounding": <score 0.0-1.0>,
  "completeness": <score 0.0-1.0>,
  "clarity": <score 0.0-1.0>,
  "feedback": "<brief explanation of scores and suggestions>"
}
</output_format>
</grading_task>`;
}

export interface GradingScores {
  accuracy: number;
  grounding: number;
  completeness: number;
  clarity: number;
  feedback: string;
}

export function parseGradingResponse(response: string): GradingScores | null {
  const jsonMatch = response.match(JSON_EXTRACT_PATTERN);
  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    const accuracy = typeof parsed.accuracy === "number" ? parsed.accuracy : 0;
    const grounding =
      typeof parsed.grounding === "number" ? parsed.grounding : 0;
    const completeness =
      typeof parsed.completeness === "number" ? parsed.completeness : 0;
    const clarity = typeof parsed.clarity === "number" ? parsed.clarity : 0;
    const feedback = typeof parsed.feedback === "string" ? parsed.feedback : "";

    return { accuracy, grounding, completeness, clarity, feedback };
  } catch {
    return null;
  }
}

export function calculateGradingResult(
  scores: GradingScores,
  rubric: GradingRubric = DEFAULT_GRADING_RUBRIC,
  threshold = 0.7
): GradingResult {
  const overallScore =
    scores.accuracy * rubric.accuracy.weight +
    scores.grounding * rubric.grounding.weight +
    scores.completeness * rubric.completeness.weight +
    scores.clarity * rubric.clarity.weight;

  return {
    overallScore,
    scores: {
      accuracy: scores.accuracy,
      grounding: scores.grounding,
      completeness: scores.completeness,
      clarity: scores.clarity,
    },
    feedback: scores.feedback,
    passed: overallScore >= threshold,
    threshold,
  };
}

export interface GradeRAGOptions {
  model?: string;
  temperature?: number;
  rubric?: GradingRubric;
  threshold?: number;
}

export type LLMCompleteFn = (
  prompt: string,
  options?: { model?: string; temperature?: number }
) => Promise<string>;

export async function gradeRAGResponse(
  input: GradeRAGInput,
  complete: LLMCompleteFn,
  options?: GradeRAGOptions
): Promise<GradingResult> {
  const prompt = buildGradingPrompt({
    ...input,
    rubric: options?.rubric ?? DEFAULT_GRADING_RUBRIC,
  });

  const response = await complete(prompt, {
    model: options?.model,
    temperature: options?.temperature ?? 0.1,
  });

  const scores = parseGradingResponse(response);

  if (!scores) {
    return {
      overallScore: 0,
      scores: { accuracy: 0, grounding: 0, completeness: 0, clarity: 0 },
      feedback: "Failed to parse grading response",
      passed: false,
      threshold: options?.threshold ?? 0.7,
    };
  }

  return calculateGradingResult(
    scores,
    options?.rubric ?? DEFAULT_GRADING_RUBRIC,
    options?.threshold ?? 0.7
  );
}

export interface BatchGradingResult {
  totalResponses: number;
  passedResponses: number;
  averageScore: number;
  scoresByDimension: {
    accuracy: number;
    grounding: number;
    completeness: number;
    clarity: number;
  };
  results: GradingResult[];
}

export async function gradeRAGResponseBatch(
  inputs: GradeRAGInput[],
  complete: LLMCompleteFn,
  options?: GradeRAGOptions
): Promise<BatchGradingResult> {
  const results: GradingResult[] = [];
  let passedCount = 0;
  let totalAccuracy = 0;
  let totalGrounding = 0;
  let totalCompleteness = 0;
  let totalClarity = 0;

  for (const input of inputs) {
    const result = await gradeRAGResponse(input, complete, options);
    results.push(result);

    if (result.passed) {
      passedCount += 1;
    }
    totalAccuracy += result.scores.accuracy;
    totalGrounding += result.scores.grounding;
    totalCompleteness += result.scores.completeness;
    totalClarity += result.scores.clarity;
  }

  const count = inputs.length || 1;

  return {
    totalResponses: inputs.length,
    passedResponses: passedCount,
    averageScore: results.reduce((sum, r) => sum + r.overallScore, 0) / count,
    scoresByDimension: {
      accuracy: totalAccuracy / count,
      grounding: totalGrounding / count,
      completeness: totalCompleteness / count,
      clarity: totalClarity / count,
    },
    results,
  };
}
