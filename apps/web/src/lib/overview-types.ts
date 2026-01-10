export type OverviewCitation = {
  index: number;
  documentId: string;
  title: string;
  url?: string;
  snippet: string;
  connectorType?: string;
  sourceType?: "document" | "media";
  relevanceScore: number;
};

export type OverviewStreamChunkType =
  | "thinking"
  | "tool_call"
  | "tool_result"
  | "text"
  | "citation"
  | "done"
  | "error";

export type OverviewToolCallData = {
  toolCallId: string;
  toolName: string;
  toolInput?: unknown;
};

export type OverviewToolResultData = {
  toolCallId: string;
  toolName: string;
  toolOutput?: unknown;
};

export type OverviewStreamChunk = {
  type: OverviewStreamChunkType;
  content?: string;
  citation?: OverviewCitation;
  groundingScore?: number;
  error?: string;
  toolCall?: OverviewToolCallData;
  toolResult?: OverviewToolResultData;
};

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

export type OverviewTiming = {
  fanoutMs: number;
  retrievalMs: number;
  contextBuildMs: number;
  generationMs: number;
  totalMs: number;
  firstTokenMs: number | null;
};

export type OverviewUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
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
