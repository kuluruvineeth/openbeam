import type { LlmAgentConfig } from "../../config";
import { createLlmAgent } from "../../patterns/llm-agent";
import { BROWSER_AGENT_PROMPT } from "./prompts";

export const browserAgentConfig: LlmAgentConfig = {
  type: "llm",
  name: "browser",
  description:
    "Browser automation agent with deterministic and autonomous modes",
  tools: [
    "browser_launch",
    "browser_navigate",
    "browser_screenshot",
    "browser_snapshot",
    "browser_click",
    "browser_type",
    "browser_select",
    "browser_evaluate",
    "browser_scrape",
    "browser_close",
    "browser_autonomous_task",
  ],
  systemPrompt: BROWSER_AGENT_PROMPT,
  maxSteps: 20,
  model: {
    temperature: 0.2,
  },
};

export const browserAgent = createLlmAgent(browserAgentConfig);

export { BROWSER_AGENT_PROMPT };
