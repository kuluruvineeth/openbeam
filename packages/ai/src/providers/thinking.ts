export interface ThinkingConfig {
  enabled: boolean;
  budgetTokens?: number;
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
  reasoningEffort?: "low" | "medium" | "high";
}

export interface GoogleThinkingConfig {
  includeThoughts?: boolean;
  thinkingBudget?: number;
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
}

export interface ThinkingProviderOptions {
  google?: {
    thinkingConfig?: GoogleThinkingConfig;
  };
  anthropic?: {
    thinking?: {
      type: "enabled" | "disabled";
      budgetTokens?: number;
    };
  };
  openai?: {
    reasoningEffort?: "low" | "medium" | "high";
  };
}

const DEFAULT_BUDGET_TOKENS = 10_240;

export function buildThinkingProviderOptions(
  config: ThinkingConfig = { enabled: true }
): Record<string, Record<string, unknown>> {
  if (!config.enabled) {
    return {};
  }

  const googleThinkingConfig: GoogleThinkingConfig = {
    includeThoughts: true,
  };

  if (config.budgetTokens) {
    googleThinkingConfig.thinkingBudget = config.budgetTokens;
  } else if (config.thinkingLevel) {
    googleThinkingConfig.thinkingLevel = config.thinkingLevel;
  } else {
    googleThinkingConfig.thinkingLevel = "high";
  }

  return {
    google: {
      thinkingConfig: googleThinkingConfig,
    },
    anthropic: {
      thinking: {
        type: "enabled",
        budgetTokens: config.budgetTokens ?? DEFAULT_BUDGET_TOKENS,
      },
    },
    openai: {
      reasoningEffort: config.reasoningEffort ?? "medium",
    },
  };
}

export function getProviderOptionsForModel(
  modelId: string,
  config: ThinkingConfig = { enabled: true }
): Record<string, Record<string, unknown>> {
  const allOptions = buildThinkingProviderOptions(config);

  if (modelId.includes("google") || modelId.includes("gemini")) {
    return { google: allOptions.google ?? {} };
  }

  if (modelId.includes("anthropic") || modelId.includes("claude")) {
    return { anthropic: allOptions.anthropic ?? {} };
  }

  if (modelId.includes("openai") || modelId.includes("gpt")) {
    return { openai: allOptions.openai ?? {} };
  }

  return allOptions;
}

export interface ReasoningChunk {
  type: string;
  delta?: string;
  text?: string;
  textDelta?: string;
}

export function isReasoningChunk(chunk: unknown): chunk is ReasoningChunk {
  if (!chunk || typeof chunk !== "object") {
    return false;
  }
  const obj = chunk as Record<string, unknown>;
  return (
    obj.type === "reasoning" ||
    obj.type === "reasoning-delta" ||
    obj.type === "reasoning-start" ||
    obj.type === "reasoning-end"
  );
}

export function extractReasoningContent(chunk: unknown): string {
  if (!chunk || typeof chunk !== "object") {
    return "";
  }

  const obj = chunk as Record<string, unknown>;

  if (typeof obj.delta === "string") {
    return obj.delta;
  }
  if (typeof obj.text === "string") {
    return obj.text;
  }
  if (typeof obj.textDelta === "string") {
    return obj.textDelta;
  }

  return "";
}

export function isReasoningDeltaChunk(chunk: unknown): boolean {
  if (!chunk || typeof chunk !== "object") {
    return false;
  }
  const obj = chunk as Record<string, unknown>;
  return (
    obj.type === "reasoning" ||
    obj.type === "reasoning-delta" ||
    obj.type === "reasoning-start" ||
    obj.type === "reasoning-end"
  );
}
