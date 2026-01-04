import type { ModelMessage } from "ai";
import type { TokenEstimator } from "./types";

const CHARS_PER_TOKEN = 4;
const MESSAGE_OVERHEAD = 4;

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function estimateMessageTokens(message: ModelMessage): number {
  let tokens = MESSAGE_OVERHEAD;

  if (typeof message.content === "string") {
    tokens += estimateTokenCount(message.content);
  } else if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if ("text" in part && typeof part.text === "string") {
        tokens += estimateTokenCount(part.text);
      }
    }
  }

  return tokens;
}

export function createTokenEstimator(): TokenEstimator {
  return {
    estimate: estimateTokenCount,
    estimateMessages(messages: ModelMessage[]): number {
      let total = 0;
      for (const msg of messages) {
        total += estimateMessageTokens(msg);
      }
      return total;
    },
  };
}

export { estimateTokenCount, estimateMessageTokens };
