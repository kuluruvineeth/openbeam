import { stringOrNull } from "../session-codec";
import type { ServerAdapterModule } from "../types";
import { executeClaude } from "./execute";
import { testClaudeEnvironment } from "./test";

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

export const claudeLocalAdapter: ServerAdapterModule = {
  type: "CLAUDE_LOCAL",
  execute: executeClaude,
  testEnvironment: testClaudeEnvironment,
  sessionCodec: { serialize, deserialize, getDisplayId },
  models: [
    { id: "claude-opus-4-6", name: "Claude Opus 4.6", provider: "anthropic" },
    {
      id: "claude-sonnet-4-5-20250929",
      name: "Claude Sonnet 4.5",
      provider: "anthropic",
    },
    {
      id: "claude-haiku-4-5-20251001",
      name: "Claude Haiku 4.5",
      provider: "anthropic",
    },
  ],
  agentConfigurationDoc: [
    "model (string): Claude model ID",
    "effort (string): Reasoning effort level (low, medium, high)",
    "maxTurns (number): Maximum agentic turns",
    "appendSystemPrompt (string): Additional system prompt text",
    "allowedTools (string[]): List of allowed tool patterns",
    "dangerouslySkipPermissions (boolean): Skip permission prompts",
    "cwd (string): Working directory",
    "timeoutSec (number): Execution timeout in seconds (default: 600)",
    "apiKey (string): Anthropic API key override",
  ].join("\n"),
};
