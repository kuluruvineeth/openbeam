import type { SessionData } from "@openbeam/types/bot";

const MAX_CONTEXT_CHARS = 24_000;
const CHARS_PER_TOKEN = 4;

interface ContextMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function buildContextMessages(session: SessionData): ContextMessage[] {
  const messages: ContextMessage[] = [];

  if (session.summary) {
    messages.push({
      role: "system",
      content: `<conversation_summary>\n${session.summary}\n</conversation_summary>`,
    });
  }

  for (const turn of session.buffer) {
    messages.push({ role: turn.role, content: turn.content });
  }

  return trimToLimit(messages, MAX_CONTEXT_CHARS);
}

function trimToLimit(
  messages: ContextMessage[],
  maxChars: number
): ContextMessage[] {
  let total = 0;
  const result: ContextMessage[] = [];

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (!msg) {
      break;
    }
    const len = msg.content.length;
    if (total + len > maxChars) {
      break;
    }
    total += len;
    result.unshift(msg);
  }

  const first = messages[0];
  if (first?.role === "system" && !result.includes(first)) {
    result.unshift(first);
  }

  return result;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function formatContextForQuery(session: SessionData): string {
  if (!session.summary && session.buffer.length === 0) {
    return "";
  }

  const parts: string[] = [];
  if (session.summary) {
    parts.push(`Previous context: ${session.summary}`);
  }

  const recentTurns = session.buffer.slice(-4);
  if (recentTurns.length > 0) {
    const turnText = recentTurns
      .map((t) => `${t.role}: ${t.content}`)
      .join("\n");
    parts.push(`Recent conversation:\n${turnText}`);
  }

  return parts.join("\n\n");
}
