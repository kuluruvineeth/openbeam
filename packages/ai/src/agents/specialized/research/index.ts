import type { LlmAgentConfig, LoopAgentConfig } from "../../config";
import { createLlmAgent } from "../../patterns/llm-agent";
import { createLoopAgent } from "../../patterns/loop-agent";
import { DEEP_RESEARCH_PROMPT, RESEARCH_AGENT_PROMPT } from "./prompts";

export const researchAgentConfig: LlmAgentConfig = {
  type: "llm",
  name: "research",
  description:
    "Research agent that searches enterprise data and synthesizes findings",
  tools: [
    "search_hybrid",
    "search_semantic",
    "doc_get",
    "doc_chunks",
    "rag_answer",
    "rag_analyze",
    "memory_recall",
  ],
  systemPrompt: RESEARCH_AGENT_PROMPT,
  maxSteps: 15,
  model: {
    temperature: 0.3,
  },
};

export const researchAgent = createLlmAgent(researchAgentConfig);

const deepResearchBaseConfig: LlmAgentConfig = {
  ...researchAgentConfig,
  name: "deep-research-base",
  systemPrompt: DEEP_RESEARCH_PROMPT,
  maxSteps: 20,
};

export const deepResearchAgentConfig: LoopAgentConfig = {
  type: "loop",
  name: "deep-research",
  description:
    "Multi-hop research agent for complex queries requiring iterative exploration",
  subAgents: [deepResearchBaseConfig],
  maxIterations: 5,
  stopCondition: {
    type: "expression",
    expression: "output.done === true",
  },
};

export const deepResearchAgent = createLoopAgent(deepResearchAgentConfig);

export { DEEP_RESEARCH_PROMPT, RESEARCH_AGENT_PROMPT };
