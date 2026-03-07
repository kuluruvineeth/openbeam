import { stringOrNull } from "../session-codec";
import type { ServerAdapterModule } from "../types";
import { executeCodex } from "./execute";
import { testCodexEnvironment } from "./test";

function serialize(
  params: Record<string, unknown>
): Record<string, unknown> | null {
  const sessionId = stringOrNull(params.sessionId);
  if (!sessionId) {
    return null;
  }
  return { sessionId };
}

function deserialize(
  raw: Record<string, unknown>
): Record<string, unknown> | null {
  const sessionId = stringOrNull(raw.sessionId);
  if (!sessionId) {
    return null;
  }
  return { sessionId };
}

function getDisplayId(params: Record<string, unknown>): string | null {
  const sessionId = stringOrNull(params.sessionId);
  if (!sessionId) {
    return null;
  }
  return sessionId.length > 12 ? sessionId.slice(0, 12) : sessionId;
}

export const codexLocalAdapter: ServerAdapterModule = {
  type: "CODEX_LOCAL",
  execute: executeCodex,
  testEnvironment: testCodexEnvironment,
  sessionCodec: { serialize, deserialize, getDisplayId },
  models: [
    { id: "o3", name: "O3", provider: "openai" },
    { id: "o4-mini", name: "O4 Mini", provider: "openai" },
    { id: "codex-mini-latest", name: "Codex Mini", provider: "openai" },
  ],
  agentConfigurationDoc: [
    "model (string): OpenAI model ID",
    "reasoningEffort (string): Reasoning effort level",
    "dangerouslyBypassApprovals (boolean): Bypass approval prompts and sandbox",
    "search (boolean): Enable web search",
    "cwd (string): Working directory",
    "timeoutSec (number): Execution timeout in seconds (default: 600)",
    "apiKey (string): OpenAI API key override",
  ].join("\n"),
};
