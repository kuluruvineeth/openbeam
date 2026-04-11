import { routeWithAgent as routeAgent } from "@openbeam/ai";
import { detectLanguage, hybridSearch, ragAnswer } from "@openbeam/services";
import type { BotResponse, UnifiedMessage } from "@openbeam/types/bot";
import { buildMultilingualSystemPrompt } from "../ai/prompts";
import type { ResolvedIdentity } from "../identity/resolver";
import { classifyComplexity, selectModel } from "./complexity";

export async function routeWithAgent(
  message: UnifiedMessage,
  identity: ResolvedIdentity
): Promise<BotResponse> {
  const text = message.text.trim();
  const lang = detectLanguage(text);
  const complexity = classifyComplexity(text);
  const model = selectModel(complexity);

  const systemPromptSuffix =
    lang.iso6391 !== "en"
      ? buildMultilingualSystemPrompt(lang.iso6391)
      : undefined;

  const result = await routeAgent({
    text,
    teamId: identity.teamId,
    provider: model.provider,
    modelId: model.modelId,
    systemPromptSuffix,
    hybridSearch,
    ragAnswer,
  });

  return assembleResponse(result, text);
}

function assembleResponse(
  result: {
    type: string;
    text: string;
    toolResults: Array<{ type: string; [key: string]: unknown }>;
  },
  originalQuery: string
): BotResponse {
  const primary = result.toolResults[0];

  if (!primary) {
    return {
      type: "text",
      text: result.text || "How can I help you?",
      responseId: crypto.randomUUID(),
    };
  }

  if (primary.type === "answer") {
    return {
      type: "answer",
      text: (primary.answer as string) ?? result.text,
      title: originalQuery,
      citations: primary.citations as BotResponse["citations"],
      confidence: primary.confidence as number,
      responseId: crypto.randomUUID(),
      followUps: ["Tell me more", "Search for related documents"],
    };
  }

  if (primary.type === "search_results") {
    return {
      type: "search_results",
      text: result.text,
      title: `Results for "${originalQuery}"`,
      results: primary.results as BotResponse["results"],
      responseId: crypto.randomUUID(),
    };
  }

  if (primary.type === "expert_list") {
    return {
      type: "expert_list",
      text: result.text,
      title: `Experts on "${(primary.topic as string) ?? originalQuery}"`,
      experts: primary.experts as BotResponse["experts"],
      responseId: crypto.randomUUID(),
    };
  }

  return {
    type: "text",
    text: result.text || "Done.",
    responseId: crypto.randomUUID(),
  };
}
