import type {
  CompletionOptions as BaseCompletionOptions,
  CompletionResult,
  ProviderId,
} from "@openplane/types/ai";
import type { FinishReason as AISDKFinishReason, ToolSet } from "ai";

export type { AISDKFinishReason };

export type AISDKToolSet = ToolSet;

export type FinishReason =
  | "stop"
  | "length"
  | "content_filter"
  | "tool_calls"
  | "error"
  | "unknown";

export interface CompletionOptions
  extends Omit<BaseCompletionOptions, "providerId" | "modelId"> {
  providerId?: ProviderId;
  modelId?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
  tools?: ToolSet;
  abortSignal?: AbortSignal;
  enableThinking?: boolean;
  onToken?: (token: string) => void;
  onThinking?: (content: string) => void;
  onComplete?: (result: CompletionResult) => void;
}
