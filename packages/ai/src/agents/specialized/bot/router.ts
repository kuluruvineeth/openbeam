import type { ProviderId } from "@openbeam/types/ai";
import { generateText, stepCountIs } from "ai";
import { registry } from "../../../providers/registry";
import { buildBotTools } from "./tools";

const ROUTER_SYSTEM_PROMPT = [
  "<role>You are OpenBeam — an enterprise search and AI assistant.</role>",
  "<capabilities>Tools: search_documents, answer_question, find_experts, computer_agents_list, computer_agent_run, computer_agent_enable.</capabilities>",
  "<routing_rules>",
  "- Questions with '?' or 'what/how/why' → answer_question",
  "- 'Find/search/show me files/docs' → search_documents",
  "- 'Who knows/works on' → find_experts",
  "- 'Run/trigger/execute agent' or 'automate' → computer_agent_run",
  "- 'List/show agents' or 'what agents' → computer_agents_list",
  "- 'Enable/activate agent' → computer_agent_enable",
  "- Greetings → respond directly, no tool",
  "- When ambiguous: prefer answer_question",
  "</routing_rules>",
  "<response_format>Short, scannable. Never expose raw JSON.</response_format>",
].join("\n");

interface RouteParams {
  text: string;
  teamId: string;
  provider: string;
  modelId: string;
  systemPromptSuffix?: string;
  hybridSearch: Parameters<typeof buildBotTools>[0]["hybridSearch"];
  ragAnswer: Parameters<typeof buildBotTools>[0]["ragAnswer"];
  externalTools?: Record<string, unknown>;
}

interface RouteResult {
  type:
    | "text"
    | "answer"
    | "search_results"
    | "expert_list"
    | "agent_list"
    | "agent_action";
  text: string;
  toolResults: Array<{ type: string; [key: string]: unknown }>;
}

export async function routeWithAgent(
  params: RouteParams
): Promise<RouteResult> {
  const systemParts = [ROUTER_SYSTEM_PROMPT];
  if (params.systemPromptSuffix) {
    systemParts.push(params.systemPromptSuffix);
  }

  const chatModel = registry.chatModel(
    params.provider as ProviderId,
    params.modelId
  );

  const nativeTools = buildBotTools({
    teamId: params.teamId,
    hybridSearch: params.hybridSearch,
    ragAnswer: params.ragAnswer,
  });

  const mergedTools = params.externalTools
    ? { ...nativeTools, ...(params.externalTools as typeof nativeTools) }
    : nativeTools;

  const result = await generateText({
    model: chatModel,
    system: systemParts.join("\n\n"),
    messages: [{ role: "user", content: params.text }],
    tools: mergedTools,
    stopWhen: stepCountIs(3),
  });

  const toolResults = extractToolResults(result.steps);
  const primary = toolResults[0];

  return {
    type: resolveResultType(primary?.type),
    text: result.text || "",
    toolResults,
  };
}

const KNOWN_TYPES = new Set([
  "answer",
  "search_results",
  "expert_list",
  "agent_list",
  "agent_action",
]);

function resolveResultType(toolType: string | undefined): RouteResult["type"] {
  if (toolType && KNOWN_TYPES.has(toolType)) {
    return toolType as RouteResult["type"];
  }
  return "text";
}

function extractToolResults(
  steps: Array<{ toolResults: unknown[] }>
): Array<{ type: string; [key: string]: unknown }> {
  const results: Array<{ type: string; [key: string]: unknown }> = [];
  for (const step of steps) {
    for (const tr of step.toolResults) {
      if (tr && typeof tr === "object" && "result" in tr) {
        const inner = (tr as { result: unknown }).result;
        if (inner && typeof inner === "object" && "type" in inner) {
          results.push(inner as { type: string; [key: string]: unknown });
        }
      }
    }
  }
  return results;
}
