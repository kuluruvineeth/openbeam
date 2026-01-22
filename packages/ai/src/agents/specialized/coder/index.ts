import type { LlmAgentConfig, SequentialAgentConfig } from "../../config";
import { createLlmAgent } from "../../patterns/llm-agent";
import { createSequentialAgent } from "../../patterns/sequential-agent";
import { CODER_AGENT_PROMPT, REVIEWER_AGENT_PROMPT } from "./prompts";

export const coderAgentConfig: LlmAgentConfig = {
  type: "llm",
  name: "coder",
  description: "Code generation and analysis agent",
  tools: ["search_hybrid", "doc_get", "doc_chunks"],
  systemPrompt: CODER_AGENT_PROMPT,
  maxSteps: 15,
  model: {
    temperature: 0.2,
  },
};

export const coderAgent = createLlmAgent(coderAgentConfig);

export const reviewerAgentConfig: LlmAgentConfig = {
  type: "llm",
  name: "reviewer",
  description: "Code review agent for production readiness",
  systemPrompt: REVIEWER_AGENT_PROMPT,
  maxSteps: 5,
  model: {
    temperature: 0.1,
  },
};

export const reviewerAgent = createLlmAgent(reviewerAgentConfig);

export const codeWithReviewConfig: SequentialAgentConfig = {
  type: "sequential",
  name: "code-with-review",
  description: "Code generation with automatic review pipeline",
  subAgents: [coderAgentConfig, reviewerAgentConfig],
};

export const codeWithReviewAgent = createSequentialAgent(codeWithReviewConfig);

export { CODER_AGENT_PROMPT, REVIEWER_AGENT_PROMPT };
