export type {
  OverviewCitation,
  OverviewStreamChunk,
  OverviewStreamChunkType,
  OverviewTiming,
  OverviewToolCallData,
  OverviewToolResultData,
  OverviewUsage,
} from "@openplane/types/overview";

import type { OverviewCitation } from "@openplane/types/overview";

export type OverviewStepStatus = "pending" | "active" | "completed";

export type OverviewStep = {
  id: string;
  toolName: string;
  displayName: string;
  status: OverviewStepStatus;
  sourceCount?: number;
  toolCallId?: string;
  durationMs?: number;
};

export type OverviewState = {
  content: string;
  citations: OverviewCitation[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  groundingScore: number | null;
  steps: OverviewStep[];
};

export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  overview_fanout: "Analyzing query",
  overview_search: "Searching knowledge base",
  overview_synthesize: "Synthesizing results",
  search_documents: "Searching documents",
  build_context: "Building context",
  analyze_query: "Analyzing query",
  search_hybrid: "Searching knowledge base",
  search_semantic: "Finding similar content",
  rag_answer: "Generating answer",
};

export function getToolDisplayName(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] ?? `Running ${toolName}`;
}
