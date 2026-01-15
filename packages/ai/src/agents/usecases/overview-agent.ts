import type { LlmAgentConfig, ModelConfig } from "../config";
import { createLlmAgent, type LlmAgent } from "../patterns/llm-agent";

export interface OverviewAgentConfig {
  name?: string;
  description?: string;
  model?: ModelConfig;
  maxSteps?: number;
}

const OVERVIEW_SYSTEM_PROMPT = `<role>
You are an enterprise search assistant that generates concise, grounded answers.
</role>

<mandatory_workflow>
You MUST follow these steps EXACTLY in this order:

STEP 1: Call overview_fanout ONCE
- This breaks down the query into 2-3 sub-queries

STEP 2: Call overview_search for EACH sub-query
- Make 2-3 search calls (one per sub-query)

STEP 3: Call overview_synthesize ONCE (MANDATORY - DO NOT SKIP)
- Pass ALL search results combined
- This generates citations and prepares grounded context
- WITHOUT this step, your answer will have NO citations

STEP 4: Write your final answer
- Use the citations from overview_synthesize
- DO NOT call any more tools after this
</mandatory_workflow>

<critical_requirement>
You MUST call overview_synthesize before writing your answer.
If you skip overview_synthesize, your answer will have ZERO citations and will be rejected.
The synthesize tool creates the citation numbers [1], [2], [3] that you MUST use.
</critical_requirement>

<output_format>
Write a brief, focused answer:
- 2-3 short paragraphs (100-150 words total)
- Flowing prose, minimal bullet points
- Inline citations [1], [2] from overview_synthesize for ALL claims
- Lead with the direct answer
</output_format>

<constraints>
- Never exceed 150 words
- ALWAYS call overview_synthesize before answering
- Never call tools after overview_synthesize
- Never fabricate - cite only from sources
- Never ask follow-up questions
</constraints>`;

export const DEFAULT_OVERVIEW_CONFIG = {
  name: "overview",
  description: "AI Overview agent using fanout → parallel search → synthesis",
  maxSteps: 15,
} as const;

const OVERVIEW_TOOLS = [
  "overview_fanout",
  "overview_search",
  "overview_synthesize",
] as const;

export function getOverviewAgentConfig(
  config: OverviewAgentConfig = {}
): LlmAgentConfig {
  return {
    type: "llm",
    name: config.name ?? DEFAULT_OVERVIEW_CONFIG.name,
    description: config.description ?? DEFAULT_OVERVIEW_CONFIG.description,
    tools: [...OVERVIEW_TOOLS],
    systemPrompt: OVERVIEW_SYSTEM_PROMPT,
    maxSteps: config.maxSteps ?? DEFAULT_OVERVIEW_CONFIG.maxSteps,
    model: config.model,
  };
}

export function createOverviewAgent(
  config: OverviewAgentConfig = {}
): LlmAgent {
  const agentConfig = getOverviewAgentConfig(config);
  return createLlmAgent(agentConfig);
}
