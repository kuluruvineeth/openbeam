import type { LlmAgentConfig } from "../../config";
import {
  createGeneratorCriticAgent,
  type GeneratorCriticConfig,
} from "../../patterns/generator-critic-agent";
import { createLlmAgent } from "../../patterns/llm-agent";
import { WRITER_AGENT_PROMPT, WRITER_CRITIC_PROMPT } from "./prompts";

export const writerAgentConfig: LlmAgentConfig = {
  type: "llm",
  name: "writer",
  description: "Content writing agent for documents, emails, and reports",
  tools: ["search_hybrid", "doc_get", "rag_answer", "memory_recall"],
  systemPrompt: WRITER_AGENT_PROMPT,
  maxSteps: 10,
  model: {
    temperature: 0.7,
  },
};

export const writerAgent = createLlmAgent(writerAgentConfig);

const writerCriticConfig: LlmAgentConfig = {
  type: "llm",
  name: "writer-critic",
  description: "Content quality evaluator",
  systemPrompt: WRITER_CRITIC_PROMPT,
  maxSteps: 3,
  model: {
    temperature: 0.1,
  },
};

export const qualityWriterConfig: GeneratorCriticConfig = {
  name: "quality-writer",
  description: "High-quality writing with self-improvement loop",
  generator: writerAgentConfig,
  critic: writerCriticConfig,
  maxIterations: 3,
  qualityThreshold: 0.85,
  exitCondition: {
    type: "quality-score",
    threshold: 0.85,
  },
};

export const qualityWriterAgent =
  createGeneratorCriticAgent(qualityWriterConfig);

export { WRITER_AGENT_PROMPT, WRITER_CRITIC_PROMPT };
