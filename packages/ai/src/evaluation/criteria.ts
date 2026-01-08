export type MetricType = "ratio" | "score" | "latency" | "count";

export interface Criterion {
  name: string;
  type: MetricType;
  target: number;
  weight: number;
  description: string;
}

export interface EvaluationCriteria {
  category: "search" | "rag" | "agent";
  criteria: Criterion[];
}

export const SEARCH_SUCCESS_CRITERIA: EvaluationCriteria = {
  category: "search",
  criteria: [
    {
      name: "relevance",
      type: "score",
      target: 0.8,
      weight: 0.4,
      description: "Average relevance score of returned results",
    },
    {
      name: "precision",
      type: "ratio",
      target: 0.7,
      weight: 0.3,
      description: "Proportion of relevant results in top-k",
    },
    {
      name: "latencyP50Ms",
      type: "latency",
      target: 50,
      weight: 0.15,
      description: "Median latency in milliseconds",
    },
    {
      name: "latencyP99Ms",
      type: "latency",
      target: 200,
      weight: 0.15,
      description: "99th percentile latency in milliseconds",
    },
  ],
};

export const RAG_SUCCESS_CRITERIA: EvaluationCriteria = {
  category: "rag",
  criteria: [
    {
      name: "groundingScore",
      type: "score",
      target: 0.8,
      weight: 0.35,
      description: "Proportion of answer grounded in sources",
    },
    {
      name: "accuracy",
      type: "score",
      target: 0.85,
      weight: 0.3,
      description: "Correctness of generated answers",
    },
    {
      name: "citationCoverage",
      type: "ratio",
      target: 0.9,
      weight: 0.2,
      description: "Proportion of claims with citations",
    },
    {
      name: "responseCompleteness",
      type: "score",
      target: 0.75,
      weight: 0.15,
      description: "How fully the question is answered",
    },
  ],
};

export const AGENT_SUCCESS_CRITERIA: EvaluationCriteria = {
  category: "agent",
  criteria: [
    {
      name: "taskCompletionRate",
      type: "ratio",
      target: 0.95,
      weight: 0.4,
      description: "Proportion of tasks completed successfully",
    },
    {
      name: "verificationPassRate",
      type: "ratio",
      target: 0.9,
      weight: 0.25,
      description: "Proportion of outputs passing verification",
    },
    {
      name: "efficiency",
      type: "score",
      target: 0.7,
      weight: 0.2,
      description: "Ratio of minimum steps to actual steps",
    },
    {
      name: "avgIterations",
      type: "count",
      target: 3,
      weight: 0.15,
      description: "Average iterations to complete task",
    },
  ],
};

export interface MetricValue {
  name: string;
  value: number;
  passed: boolean;
}

export interface CriteriaEvaluationResult {
  category: "search" | "rag" | "agent";
  overallScore: number;
  passed: boolean;
  metrics: MetricValue[];
  failedCriteria: string[];
}

export function evaluateCriteria(
  criteria: EvaluationCriteria,
  metrics: Record<string, number>
): CriteriaEvaluationResult {
  const results: MetricValue[] = [];
  const failedCriteria: string[] = [];
  let weightedScore = 0;
  let totalWeight = 0;

  for (const criterion of criteria.criteria) {
    const value = metrics[criterion.name] ?? 0;
    let passed: boolean;

    if (criterion.type === "latency" || criterion.type === "count") {
      passed = value <= criterion.target;
    } else {
      passed = value >= criterion.target;
    }

    if (!passed) {
      failedCriteria.push(criterion.name);
    }

    const normalizedScore = calculateNormalizedScore(criterion, value);
    weightedScore += normalizedScore * criterion.weight;
    totalWeight += criterion.weight;

    results.push({
      name: criterion.name,
      value,
      passed,
    });
  }

  const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

  return {
    category: criteria.category,
    overallScore,
    passed: failedCriteria.length === 0,
    metrics: results,
    failedCriteria,
  };
}

function calculateNormalizedScore(criterion: Criterion, value: number): number {
  if (criterion.type === "latency" || criterion.type === "count") {
    if (value <= criterion.target) {
      return 1;
    }
    const overshoot = value / criterion.target;
    return Math.max(0, 1 - (overshoot - 1));
  }

  if (value >= criterion.target) {
    return 1;
  }
  return value / criterion.target;
}

export function evaluateSearchCriteria(
  metrics: Record<string, number>
): CriteriaEvaluationResult {
  return evaluateCriteria(SEARCH_SUCCESS_CRITERIA, metrics);
}

export function evaluateRAGCriteria(
  metrics: Record<string, number>
): CriteriaEvaluationResult {
  return evaluateCriteria(RAG_SUCCESS_CRITERIA, metrics);
}

export function evaluateAgentCriteria(
  metrics: Record<string, number>
): CriteriaEvaluationResult {
  return evaluateCriteria(AGENT_SUCCESS_CRITERIA, metrics);
}
