import type { ChatModel } from "./types";

export const GOOGLE_MODELS: ChatModel[] = [
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    provider: "google",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    pricing: {
      inputPer1M: 0.5,
      outputPer1M: 3.0,
    },
  },
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    provider: "google",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsTools: true,
    supportsVision: true,
    supportsStreaming: true,
    pricing: {
      inputPer1M: 2.0,
      outputPer1M: 12.0,
    },
  },
];
