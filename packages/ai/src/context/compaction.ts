import { generateText } from "ai";
import { getConfig } from "../config";
import { registry } from "../providers/registry";
import { estimateTokenCount } from "./estimator";
import type { MaskedObservation } from "./types";

export interface CompactionConfig {
  preserveRecentCount?: number;
  maxSummaryTokens?: number;
  model?: string;
}

export interface CompactionResult {
  summary: string;
  originalTokens: number;
  compactedTokens: number;
  eventsCompacted: number;
  preservedEvents: ContextEvent[];
}

export interface ContextEvent {
  id: string;
  type:
    | "user_message"
    | "assistant_message"
    | "tool_call"
    | "tool_result"
    | "compaction_summary";
  content: string;
  timestamp: number;
  metadata?: {
    toolName?: string;
    toolCallId?: string;
    success?: boolean;
    latencyMs?: number;
  };
}

const COMPACTION_PROMPT = `Summarize this conversation while preserving:
1. Architectural decisions and rationale
2. Unresolved issues and their symptoms
3. Implementation details that affect future work
4. File paths and identifiers referenced
5. User preferences and constraints stated

Discard:
1. Redundant tool outputs (file contents exist in environment)
2. Exploratory searches that yielded no results
3. Verbose error traces (keep error message, discard stack)
4. Intermediate reasoning that led to discarded approaches

Format as a structured summary with clear sections. Be concise but preserve all critical information.`;

const DEFAULT_PRESERVE_RECENT = 3;
const DEFAULT_MAX_SUMMARY_TOKENS = 2000;

function formatEventsForCompaction(events: ContextEvent[]): string {
  const parts: string[] = [];

  for (const event of events) {
    switch (event.type) {
      case "user_message":
        parts.push(`USER: ${event.content}`);
        break;
      case "assistant_message":
        parts.push(`ASSISTANT: ${event.content}`);
        break;
      case "tool_call":
        parts.push(`TOOL_CALL [${event.metadata?.toolName}]: ${event.content}`);
        break;
      case "tool_result":
        parts.push(
          `TOOL_RESULT [${event.metadata?.toolName}]: ${truncateForCompaction(event.content)}`
        );
        break;
      case "compaction_summary":
        parts.push(`PREVIOUS_SUMMARY: ${event.content}`);
        break;
      default:
        break;
    }
  }

  return parts.join("\n\n---\n\n");
}

function truncateForCompaction(content: string, maxChars = 2000): string {
  if (content.length <= maxChars) {
    return content;
  }
  return `${content.slice(0, maxChars)}... [truncated, ${content.length} chars total]`;
}

export async function compactContext(
  events: ContextEvent[],
  config: CompactionConfig = {}
): Promise<CompactionResult> {
  const preserveCount = config.preserveRecentCount ?? DEFAULT_PRESERVE_RECENT;
  const maxSummaryTokens =
    config.maxSummaryTokens ?? DEFAULT_MAX_SUMMARY_TOKENS;

  if (events.length <= preserveCount) {
    return {
      summary: "",
      originalTokens: calculateTotalTokens(events),
      compactedTokens: calculateTotalTokens(events),
      eventsCompacted: 0,
      preservedEvents: events,
    };
  }

  const recentEvents = events.slice(-preserveCount);
  const olderEvents = events.slice(0, -preserveCount);
  const originalTokens = calculateTotalTokens(olderEvents);

  const formattedContent = formatEventsForCompaction(olderEvents);

  const aiConfig = getConfig();
  const model = registry.chatModel(
    aiConfig.defaultProvider,
    config.model ?? aiConfig.defaultChatModel
  );

  const result = await generateText({
    model,
    system: COMPACTION_PROMPT,
    prompt: formattedContent,
    maxOutputTokens: maxSummaryTokens,
  });

  const summaryEvent: ContextEvent = {
    id: `compaction_${Date.now()}`,
    type: "compaction_summary",
    content: result.text,
    timestamp: Date.now(),
  };

  const compactedTokens = estimateTokenCount(result.text);

  return {
    summary: result.text,
    originalTokens,
    compactedTokens,
    eventsCompacted: olderEvents.length,
    preservedEvents: [summaryEvent, ...recentEvents],
  };
}

function calculateTotalTokens(events: ContextEvent[]): number {
  let total = 0;
  for (const event of events) {
    total += estimateTokenCount(event.content);
  }
  return total;
}

export function observationsToEvents(
  observations: MaskedObservation[]
): ContextEvent[] {
  return observations.map((obs) => ({
    id: obs.id,
    type: "tool_result" as const,
    content: obs.masked ? obs.summary : obs.fullContent,
    timestamp: obs.timestamp,
    metadata: {
      toolName: obs.toolName,
    },
  }));
}

export function shouldCompact(
  events: ContextEvent[],
  maxTokens: number,
  threshold = 0.7
): boolean {
  const totalTokens = calculateTotalTokens(events);
  return totalTokens / maxTokens >= threshold;
}
