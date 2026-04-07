import { createLlmAgent } from "@openbeam/ai";

const SYSTEM_PROMPT = `You are OpenBeam, an enterprise search and AI assistant.
You help users find information, answer questions, discover experts, and take actions across their connected tools.
Be concise — responses go to chat platforms with character limits.
Always cite sources when answering questions.
If you cannot find relevant information, say so clearly.`;

export function createBotAgent() {
  return createLlmAgent({
    name: "bot-assistant",
    description: "Multi-platform bot agent with enterprise search capabilities",
    type: "llm",
    tools: ["search_hybrid", "rag_answer", "doc_get", "connector_list"],
    systemPrompt: SYSTEM_PROMPT,
    maxSteps: 5,
  });
}
