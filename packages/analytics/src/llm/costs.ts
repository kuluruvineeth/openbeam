import {
  calculateModelCost,
  getModelPricing,
  type ProviderId,
} from "@openplane/types/ai";

export type LLMProvider = ProviderId;

interface TokenCost {
  input: number;
  output: number;
  cached?: number;
}

const customCosts: Record<string, TokenCost> = {};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedTokens = 0
): number {
  const result = calculateModelCost(model, inputTokens, outputTokens, {
    cacheTokens: cachedTokens,
  });

  if (result.totalCostUsd > 0) {
    return result.totalCostUsd;
  }

  const costs = customCosts[model];
  if (!costs) {
    return 0;
  }

  const inputCost = (inputTokens - cachedTokens) * costs.input;
  const outputCost = outputTokens * costs.output;
  const cachedCost = cachedTokens * (costs.cached ?? costs.input * 0.1);

  return (inputCost + outputCost + cachedCost) / 1_000_000;
}

export function getModelCosts(model: string): TokenCost | null {
  const pricing = getModelPricing(model);
  if (pricing) {
    return {
      input: pricing.inputPer1M,
      output: pricing.outputPer1M,
      cached: pricing.cachePer1M,
    };
  }
  return customCosts[model] ?? null;
}

export function registerModelCost(model: string, costs: TokenCost): void {
  customCosts[model] = costs;
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
  const costs = getModelCosts(model);
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
