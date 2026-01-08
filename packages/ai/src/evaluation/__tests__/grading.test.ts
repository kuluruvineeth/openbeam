import { describe, expect, it } from "bun:test";
import {
  buildGradingPrompt,
  calculateGradingResult,
  DEFAULT_GRADING_RUBRIC,
  type GradingScores,
  gradeRAGResponse,
  parseGradingResponse,
} from "../grading";

describe("buildGradingPrompt", () => {
  it("includes question and context", () => {
    const prompt = buildGradingPrompt({
      question: "What is OAuth?",
      context: "OAuth is an authorization protocol.",
      response: "OAuth is for authorization.",
    });

    expect(prompt).toContain("What is OAuth?");
    expect(prompt).toContain("OAuth is an authorization protocol.");
    expect(prompt).toContain("OAuth is for authorization.");
  });

  it("includes expected answer when provided", () => {
    const prompt = buildGradingPrompt({
      question: "What is 2+2?",
      context: "Basic math.",
      response: "4",
      expectedAnswer: "The answer is 4.",
    });

    expect(prompt).toContain("<expected_answer>");
    expect(prompt).toContain("The answer is 4.");
  });

  it("omits expected answer when not provided", () => {
    const prompt = buildGradingPrompt({
      question: "What is 2+2?",
      context: "Basic math.",
      response: "4",
    });

    expect(prompt).not.toContain("<expected_answer>");
  });

  it("includes rubric criteria", () => {
    const prompt = buildGradingPrompt({
      question: "Test",
      context: "Context",
      response: "Response",
    });

    expect(prompt).toContain("Accuracy");
    expect(prompt).toContain("Grounding");
    expect(prompt).toContain("Completeness");
    expect(prompt).toContain("Clarity");
  });
});

describe("parseGradingResponse", () => {
  it("parses valid JSON response", () => {
    const response = `
    Here is my evaluation:
    {
      "accuracy": 0.9,
      "grounding": 0.85,
      "completeness": 0.8,
      "clarity": 0.95,
      "feedback": "Great response with minor issues."
    }
    `;

    const scores = parseGradingResponse(response);

    expect(scores).not.toBeNull();
    expect(scores?.accuracy).toBe(0.9);
    expect(scores?.grounding).toBe(0.85);
    expect(scores?.completeness).toBe(0.8);
    expect(scores?.clarity).toBe(0.95);
    expect(scores?.feedback).toBe("Great response with minor issues.");
  });

  it("returns null for invalid JSON", () => {
    const result = parseGradingResponse("No JSON here");

    expect(result).toBeNull();
  });

  it("handles missing fields with defaults", () => {
    const response = '{"accuracy": 0.5}';

    const scores = parseGradingResponse(response);

    expect(scores?.accuracy).toBe(0.5);
    expect(scores?.grounding).toBe(0);
    expect(scores?.completeness).toBe(0);
    expect(scores?.clarity).toBe(0);
    expect(scores?.feedback).toBe("");
  });

  it("extracts JSON from surrounding text", () => {
    const response = `
    Based on my analysis, the scores are as follows:
    {"accuracy": 0.7, "grounding": 0.8, "completeness": 0.6, "clarity": 0.9, "feedback": "Good"}
    That concludes my evaluation.
    `;

    const scores = parseGradingResponse(response);

    expect(scores?.accuracy).toBe(0.7);
  });
});

describe("calculateGradingResult", () => {
  const mockScores: GradingScores = {
    accuracy: 0.9,
    grounding: 0.8,
    completeness: 0.7,
    clarity: 0.85,
    feedback: "Good response.",
  };

  it("calculates weighted overall score", () => {
    const result = calculateGradingResult(mockScores);

    const expected = 0.9 * 0.35 + 0.8 * 0.3 + 0.7 * 0.2 + 0.85 * 0.15;

    expect(result.overallScore).toBeCloseTo(expected, 2);
  });

  it("marks as passed when above threshold", () => {
    const result = calculateGradingResult(
      mockScores,
      DEFAULT_GRADING_RUBRIC,
      0.7
    );

    expect(result.passed).toBe(true);
    expect(result.threshold).toBe(0.7);
  });

  it("marks as failed when below threshold", () => {
    const lowScores: GradingScores = {
      accuracy: 0.3,
      grounding: 0.4,
      completeness: 0.2,
      clarity: 0.5,
      feedback: "Poor response.",
    };

    const result = calculateGradingResult(
      lowScores,
      DEFAULT_GRADING_RUBRIC,
      0.7
    );

    expect(result.passed).toBe(false);
  });

  it("includes individual scores", () => {
    const result = calculateGradingResult(mockScores);

    expect(result.scores.accuracy).toBe(0.9);
    expect(result.scores.grounding).toBe(0.8);
    expect(result.scores.completeness).toBe(0.7);
    expect(result.scores.clarity).toBe(0.85);
  });

  it("includes feedback", () => {
    const result = calculateGradingResult(mockScores);

    expect(result.feedback).toBe("Good response.");
  });
});

describe("gradeRAGResponse", () => {
  it("returns grading result from LLM", async () => {
    const mockComplete = async () =>
      JSON.stringify({
        accuracy: 0.85,
        grounding: 0.9,
        completeness: 0.8,
        clarity: 0.75,
        feedback: "Well-grounded response.",
      });

    const result = await gradeRAGResponse(
      {
        question: "What is OAuth?",
        context: "OAuth is an authorization protocol.",
        response: "OAuth enables secure authorization.",
      },
      mockComplete
    );

    expect(result.passed).toBe(true);
    expect(result.scores.grounding).toBe(0.9);
    expect(result.feedback).toBe("Well-grounded response.");
  });

  it("handles parse failure gracefully", async () => {
    const mockComplete = async () => "Invalid response";

    const result = await gradeRAGResponse(
      {
        question: "Test",
        context: "Context",
        response: "Response",
      },
      mockComplete
    );

    expect(result.passed).toBe(false);
    expect(result.overallScore).toBe(0);
    expect(result.feedback).toContain("Failed to parse");
  });

  it("uses custom threshold", async () => {
    const mockComplete = async () =>
      JSON.stringify({
        accuracy: 0.6,
        grounding: 0.6,
        completeness: 0.6,
        clarity: 0.6,
        feedback: "Average.",
      });

    const resultDefault = await gradeRAGResponse(
      { question: "Q", context: "C", response: "R" },
      mockComplete
    );

    const resultLowThreshold = await gradeRAGResponse(
      { question: "Q", context: "C", response: "R" },
      mockComplete,
      { threshold: 0.5 }
    );

    expect(resultDefault.passed).toBe(false);
    expect(resultLowThreshold.passed).toBe(true);
  });
});

describe("DEFAULT_GRADING_RUBRIC", () => {
  it("has all required fields", () => {
    expect(DEFAULT_GRADING_RUBRIC.accuracy).toBeDefined();
    expect(DEFAULT_GRADING_RUBRIC.grounding).toBeDefined();
    expect(DEFAULT_GRADING_RUBRIC.completeness).toBeDefined();
    expect(DEFAULT_GRADING_RUBRIC.clarity).toBeDefined();
  });

  it("weights sum to 1", () => {
    const total =
      DEFAULT_GRADING_RUBRIC.accuracy.weight +
      DEFAULT_GRADING_RUBRIC.grounding.weight +
      DEFAULT_GRADING_RUBRIC.completeness.weight +
      DEFAULT_GRADING_RUBRIC.clarity.weight;

    expect(total).toBeCloseTo(1, 2);
  });
});
