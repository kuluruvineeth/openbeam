export type LLMProvider =
  | "anthropic"
  | "openai"
  | "google"
  | "azure"
  | "ollama";

interface TokenCost {
  input: number;
  output: number;
  cached?: number;
}

const TOKEN_COSTS: Record<string, TokenCost> = {
  "claude-opus-4-20250514": { input: 15.0, output: 75.0, cached: 1.5 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0, cached: 0.3 },
  "claude-haiku-3-5-20241022": { input: 0.8, output: 4.0, cached: 0.08 },
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10.0, output: 30.0 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  "gemini-2.0-flash": { input: 0.075, output: 0.3 },
  "gemini-2.0-pro": { input: 1.25, output: 5.0 },
  "gemini-1.5-pro": { input: 1.25, output: 5.0 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens = 0
): number {
  const costs = TOKEN_COSTS[model];
  if (!costs) {
    return 0;
  }

  const inputCost = (inputTokens - cachedTokens) * costs.input;
  const outputCost = outputTokens * costs.output;
  const cachedCost = cachedTokens * (costs.cached ?? costs.input * 0.1);

  return (inputCost + outputCost + cachedCost) / 1_000_000;
}

export function getModelCosts(model: string): TokenCost | null {
  return TOKEN_COSTS[model] ?? null;
}

export function registerModelCost(model: string, costs: TokenCost): void {
  TOKEN_COSTS[model] = costs;
}

export function estimateCostFromPrompt(
  model: string,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): number {
  return calculateCost(model, estimatedInputTokens, estimatedOutputTokens, 0);
}

export interface CostBreakdown {
  inputCostUsd: number;
  outputCostUsd: number;
  cachedCostUsd: number;
  totalCostUsd: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

export function getCostBreakdown(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens = 0
): CostBreakdown {
  const costs = TOKEN_COSTS[model];
  if (!costs) {
    return {
      inputCostUsd: 0,
      outputCostUsd: 0,
      cachedCostUsd: 0,
      totalCostUsd: 0,
      inputTokens,
      outputTokens,
      cachedTokens,
    };
  }

  const inputCostUsd = ((inputTokens - cachedTokens) * costs.input) / 1_000_000;
  const outputCostUsd = (outputTokens * costs.output) / 1_000_000;
  const cachedCostUsd =
    (cachedTokens * (costs.cached ?? costs.input * 0.1)) / 1_000_000;

  return {
    inputCostUsd,
    outputCostUsd,
    cachedCostUsd,
    totalCostUsd: inputCostUsd + outputCostUsd + cachedCostUsd,
    inputTokens,
    outputTokens,
    cachedTokens,
  };
}
