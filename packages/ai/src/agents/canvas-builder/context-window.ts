const CHARS_PER_TOKEN = 4;

type Message = { role: string; content: string };

export function trimConversationHistory(
  history: Message[],
  maxTokenEstimate: number
): Message[] {
  const maxChars = maxTokenEstimate * CHARS_PER_TOKEN;
  let totalChars = 0;
  const trimmed: Message[] = [];

  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (!msg) {
      break;
    }
    const msgChars = msg.content.length;
    if (totalChars + msgChars > maxChars) {
      break;
    }
    totalChars += msgChars;
    trimmed.unshift(msg);
  }

  return trimmed;
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function buildContextWindow(
  systemPrompt: string,
  canvasState: string,
  history: Message[],
  maxTokens: number
): { system: string; messages: Message[] } {
  const reservedTokens =
    estimateTokenCount(systemPrompt) + estimateTokenCount(canvasState);
  const availableForHistory = Math.max(0, maxTokens - reservedTokens);
  const trimmedHistory = trimConversationHistory(history, availableForHistory);

  return {
    system: `${systemPrompt}\n\n<canvas_state>\n${canvasState}\n</canvas_state>`,
    messages: trimmedHistory,
  };
}
