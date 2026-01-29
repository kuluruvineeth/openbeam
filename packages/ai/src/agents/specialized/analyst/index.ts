import type { LlmAgentConfig, ParallelAgentConfig } from "../../config";
import { createLlmAgent } from "../../patterns/llm-agent";
import { createParallelAgent } from "../../patterns/parallel-agent";
import {
  ANALYST_AGENT_PROMPT,
  SOURCE_SPECIFIC_ANALYST_PROMPT,
} from "./prompts";

export const analystAgentConfig: LlmAgentConfig = {
  type: "llm",
  name: "analyst",
  description: "Data analysis and insights agent",
  tools: [
    "search_hybrid",
    "doc_get",
    "doc_chunks",
    "data_transform",
    "data_extract",
    "data_aggregate",
    "rag_analyze",
  ],
  systemPrompt: ANALYST_AGENT_PROMPT,
  maxSteps: 20,
  model: {
    temperature: 0.3,
  },
};

export const analystAgent = createLlmAgent(analystAgentConfig);

const createSourceAnalystConfig = (source: string): LlmAgentConfig => ({
  ...analystAgentConfig,
  name: `${source}-analyst`,
  description: `Data analyst specialized for ${source} data`,
  systemPrompt: SOURCE_SPECIFIC_ANALYST_PROMPT(source),
});

export const slackAnalystConfig = createSourceAnalystConfig("Slack");
export const notionAnalystConfig = createSourceAnalystConfig("Notion");
export const driveAnalystConfig = createSourceAnalystConfig("Google Drive");

export const multiSourceAnalystConfig: ParallelAgentConfig = {
  type: "parallel",
  name: "multi-source-analyst",
  description: "Analyze data from multiple sources in parallel",
  subAgents: [slackAnalystConfig, notionAnalystConfig, driveAnalystConfig],
  aggregator: {
    strategy: "merge",
  },
};

export const multiSourceAnalystAgent = createParallelAgent(
  multiSourceAnalystConfig
);

export { ANALYST_AGENT_PROMPT, SOURCE_SPECIFIC_ANALYST_PROMPT };
