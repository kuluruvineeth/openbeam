import type { ChatModel } from "./types";

export const ANTHROPIC_MODELS: ChatModel[] = [
  {
    id: "claude-opus-4-5",
    name: "Claude Opus 4.5",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    pricing: {
      inputPer1M: 5.0,
      outputPer1M: 25.0,
      cachePer1M: 0.5,
    },
  },
  {
    id: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    pricing: {
      inputPer1M: 3.0,
      outputPer1M: 15.0,
      cachePer1M: 0.3,
    },
  },
];
