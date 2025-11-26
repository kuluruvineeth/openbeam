/**
 * Google Provider
 *
 * Provider factory for Google AI models including Gemini 2.5, Gemini 2.0, and Gemini 1.5 series.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { EmbeddingModelV1, LanguageModelV1 } from "ai";
import { getConfig } from "../config";
import type { ModelInfo, ProviderFactory } from "./types";

/**
 * Google model catalog with latest models
 * Updated: November 2025
 */
const GOOGLE_MODELS: ModelInfo[] = [
  // === Gemini 2.5 Series (Latest) ===
  {
    id: "gemini-2.5-pro-preview-05-06",
    name: "Gemini 2.5 Pro Preview",
    provider: "google",
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.001_25,
    costPer1kOutput: 0.01,
  },
  {
    id: "gemini-2.5-flash-preview-05-20",
    name: "Gemini 2.5 Flash Preview",
    provider: "google",
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.000_15,
    costPer1kOutput: 0.0006,
  },
  // === Gemini 2.0 Series ===
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "google",
    contextWindow: 1_000_000,
    maxOutputTokens: 8192,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0004,
  },
  {
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash Experimental",
    provider: "google",
    contextWindow: 1_000_000,
    maxOutputTokens: 8192,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0, // Free tier
    costPer1kOutput: 0,
  },
  {
    id: "gemini-2.0-flash-thinking-exp",
    name: "Gemini 2.0 Flash Thinking",
    provider: "google",
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0, // Free tier
    costPer1kOutput: 0,
  },
  // === Gemini 1.5 Series ===
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "google",
    contextWindow: 2_000_000,
    maxOutputTokens: 8192,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.001_25,
    costPer1kOutput: 0.005,
  },
  {
    id: "gemini-1.5-pro-002",
    name: "Gemini 1.5 Pro 002",
    provider: "google",
    contextWindow: 2_000_000,
    maxOutputTokens: 8192,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.001_25,
    costPer1kOutput: 0.005,
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "google",
    contextWindow: 1_000_000,
    maxOutputTokens: 8192,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.000_075,
    costPer1kOutput: 0.0003,
  },
  {
    id: "gemini-1.5-flash-002",
    name: "Gemini 1.5 Flash 002",
    provider: "google",
    contextWindow: 1_000_000,
    maxOutputTokens: 8192,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.000_075,
    costPer1kOutput: 0.0003,
  },
  {
    id: "gemini-1.5-flash-8b",
    name: "Gemini 1.5 Flash 8B",
    provider: "google",
    contextWindow: 1_000_000,
    maxOutputTokens: 8192,
    capabilities: {
      streaming: true,
      toolCalling: true,
      vision: true,
      json: true,
    },
    costPer1kInput: 0.000_037_5,
    costPer1kOutput: 0.000_15,
  },
  // === Embedding Models ===
  {
    id: "text-embedding-004",
    name: "Text Embedding 004",
    provider: "google",
    contextWindow: 2048,
    maxOutputTokens: 0,
    capabilities: {
      streaming: false,
      toolCalling: false,
      vision: false,
      json: false,
      embedding: true,
    },
    costPer1kInput: 0.000_01,
  },
  {
    id: "text-embedding-005",
    name: "Text Embedding 005",
    provider: "google",
    contextWindow: 2048,
    maxOutputTokens: 0,
    capabilities: {
      streaming: false,
      toolCalling: false,
      vision: false,
      json: false,
      embedding: true,
    },
    costPer1kInput: 0.000_01,
  },
];

/**
 * Create a Google AI client instance
 */
function createClient() {
  const config = getConfig();
  return createGoogleGenerativeAI({
    apiKey: config.google.apiKey,
  });
}

/**
 * Google Provider Factory
 */
export const googleProvider: ProviderFactory = {
  createChatModel(modelId: string): LanguageModelV1 {
    const client = createClient();
    return client(modelId);
  },

  createEmbeddingModel(modelId: string): EmbeddingModelV1<string> {
    const client = createClient();
    return client.textEmbeddingModel(modelId);
  },

  getAvailableModels(): ModelInfo[] {
    return GOOGLE_MODELS;
  },

  isConfigured(): boolean {
    const config = getConfig();
    return !!config.google.apiKey;
  },
};

export default googleProvider;
