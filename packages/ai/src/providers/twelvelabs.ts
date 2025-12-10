import type { EmbeddingModel, LanguageModel } from "ai";
import type {
  AIProvider,
  ChatModelDefinition,
  EmbeddingModelDefinition,
} from "./types";

const EMBEDDING_MODELS: EmbeddingModelDefinition[] = [
  {
    id: "Marengo-retrieval-2.7",
    name: "Marengo Retrieval 2.7",
    provider: "twelvelabs",
    dimensions: 1024,
    maxTokens: 77,
    costPer1kTokens: undefined,
  },
  {
    id: "Marengo-retrieval-2.8",
    name: "Marengo Retrieval 2.8",
    provider: "twelvelabs",
    dimensions: 512,
    maxTokens: 500,
    costPer1kTokens: undefined,
  },
];

interface TwelveLabsEmbeddingResponse {
  video_embedding?: { float: number[] };
  text_embedding?: { float: number[] };
}

async function embedWithTwelveLabs(
  apiKey: string,
  baseUrl: string,
  modelId: string,
  values: string[]
): Promise<{ embeddings: number[][]; usage: { tokens: number } }> {
  const embeddings: number[][] = [];

  for (const text of values) {
    const response = await fetch(`${baseUrl}/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model_name: modelId,
        text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`TwelveLabs embedding error: ${error}`);
    }

    const result = (await response.json()) as TwelveLabsEmbeddingResponse;
    const embedding = result.text_embedding?.float;

    if (!embedding) {
      throw new Error("No text embedding returned from TwelveLabs");
    }

    embeddings.push(embedding);
  }

  return {
    embeddings,
    usage: { tokens: values.reduce((acc, v) => acc + v.length, 0) },
  };
}

function createTwelveLabsTextEmbeddingModel(
  apiKey: string,
  baseUrl: string,
  modelId: string
): EmbeddingModel<string> {
  return {
    specificationVersion: "v2",
    modelId: `twelvelabs:${modelId}`,
    provider: "twelvelabs",
    maxEmbeddingsPerCall: 1,
    supportsParallelCalls: false,

    async doEmbed({ values }) {
      return await embedWithTwelveLabs(apiKey, baseUrl, modelId, values);
    },
  };
}

export function createTwelveLabsProvider(): AIProvider {
  const apiKey = process.env.TWELVELABS_API_KEY || "";
  const baseUrl =
    process.env.TWELVELABS_BASE_URL || "https://api.twelvelabs.io/v1.3";

  return {
    id: "twelvelabs",
    name: "TwelveLabs",

    getChatModel(_modelId: string): LanguageModel {
      throw new Error("TwelveLabs does not support chat models");
    },

    getEmbeddingModel(modelId: string): EmbeddingModel<string> {
      return createTwelveLabsTextEmbeddingModel(apiKey, baseUrl, modelId);
    },

    listChatModels(): ChatModelDefinition[] {
      return [];
    },

    listEmbeddingModels(): EmbeddingModelDefinition[] {
      return EMBEDDING_MODELS;
    },

    isConfigured(): boolean {
      return !!apiKey;
    },
  };
}
