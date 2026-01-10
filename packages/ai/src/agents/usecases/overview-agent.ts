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

<workflow>
1. Call overview_fanout to decompose the query into 2-4 sub-queries
2. Call overview_search for EACH sub-query
3. Call overview_synthesize with ALL search results
4. Write a CONCISE answer using the synthesized context
</workflow>

<output_format>
Write a brief, focused answer. Hard requirements:
- 2-3 short paragraphs maximum (100-150 words total)
- Flowing prose, not exhaustive lists
- Only use bullet points for 3+ truly discrete items
- No section headers unless absolutely necessary
- Inline citations [1], [2] for claims
- One blank line between paragraphs maximum
</output_format>

<style>
- Lead with the direct answer to the question
- Summarize key points, not every detail
- Prefer "X does Y [1]" over "X does Y. Additionally, X also does Z. Furthermore..."
- If multiple aspects exist, mention them briefly in one sentence
</style>

<constraints>
- Never exceed 150 words
- Never use headers for simple queries
- Never list more than 4 bullet points
- Never repeat information
- Never fabricate - cite only from sources
- Never ask follow-up questions
- Never add filler phrases or disclaimers
</constraints>`;

export const DEFAULT_OVERVIEW_CONFIG = {
  name: "overview",
  description: "AI Overview agent using fanout → parallel search → synthesis",
  maxSteps: 10,
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
