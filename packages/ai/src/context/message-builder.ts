import type { ModelMessage } from "ai";
import type { ContextEvent } from "./compaction";
import type { Objective } from "./objectives";
import type { VirtualFileReference } from "./virtual-files";

export interface CacheControl {
  type: "ephemeral";
}

export interface TextPartWithCache {
  type: "text";
  text: string;
  cache_control?: CacheControl;
}

export interface MessageBuilderOptions {
  systemPrompt: string;
  toolDefinitions?: string;
  memoryContext?: string;
  virtualFiles?: VirtualFileReference[];
  objectives?: Objective[];
  events?: ContextEvent[];
  cacheConfig?: {
    cacheSystemPrompt?: boolean;
    cacheToolDefs?: boolean;
    cacheMemory?: boolean;
  };
}

export interface BuiltContext {
  messages: ModelMessage[];
  tokenEstimate: number;
  cacheBreakpoints: number[];
}

const CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Building messages requires conditional assembly
export function buildContextMessages(
  options: MessageBuilderOptions
): BuiltContext {
  const messages: ModelMessage[] = [];
  const cacheBreakpoints: number[] = [];
  let tokenEstimate = 0;
  let currentPosition = 0;

  const cacheConfig = options.cacheConfig ?? {
    cacheSystemPrompt: true,
    cacheToolDefs: true,
    cacheMemory: true,
  };

  messages.push({
    role: "system",
    content: options.systemPrompt,
  });
  tokenEstimate += estimateTokens(options.systemPrompt);

  if (cacheConfig.cacheSystemPrompt) {
    cacheBreakpoints.push(currentPosition);
  }
  currentPosition += 1;

  if (options.toolDefinitions) {
    messages.push({
      role: "user",
      content: formatToolDefinitions(options.toolDefinitions),
    });
    tokenEstimate += estimateTokens(options.toolDefinitions);

    if (cacheConfig.cacheToolDefs) {
      cacheBreakpoints.push(currentPosition);
    }
    currentPosition += 1;
  }

  if (options.memoryContext) {
    messages.push({
      role: "user",
      content: formatMemoryContext(options.memoryContext),
    });
    tokenEstimate += estimateTokens(options.memoryContext);

    if (cacheConfig.cacheMemory) {
      cacheBreakpoints.push(currentPosition);
    }
    currentPosition += 1;
  }

  if (options.virtualFiles && options.virtualFiles.length > 0) {
    messages.push({
      role: "user",
      content: formatVirtualFilesContext(options.virtualFiles),
    });
    for (const file of options.virtualFiles) {
      tokenEstimate += estimateTokens(file.preview) + 50;
    }
    currentPosition += 1;
  }

  if (options.events) {
    for (const event of options.events) {
      const eventMessage = eventToMessage(event);
      if (eventMessage) {
        messages.push(eventMessage);
        tokenEstimate += estimateTokens(event.content);
        currentPosition += 1;
      }
    }
  }

  if (options.objectives && options.objectives.length > 0) {
    messages.push({
      role: "assistant",
      content: formatObjectivesRecitation(options.objectives),
    });
    tokenEstimate += estimateObjectivesTokens(options.objectives);
  }

  return { messages, tokenEstimate, cacheBreakpoints };
}

function formatToolDefinitions(definitions: string): string {
  return `## Available Tools\n\n${definitions}`;
}

function formatMemoryContext(memory: string): string {
  return `## Relevant Context\n\n${memory}`;
}

function formatVirtualFilesContext(files: VirtualFileReference[]): string {
  const lines: string[] = ["## Virtual Files Available"];

  for (const file of files) {
    lines.push(`
[Virtual File: ${file.fileId}]
Name: ${file.name}
Tokens: ${file.tokenCount}
Preview: ${file.preview}
---
Use virtual_file_read tool with id="${file.fileId}" to access full content.
`);
  }

  return lines.join("\n");
}

function formatObjectivesRecitation(objectives: Objective[]): string {
  const current = objectives.find((o) => o.status === "in_progress");
  const completed = objectives.filter((o) => o.status === "completed");
  const pending = objectives.filter((o) => o.status === "pending");
  const blocked = objectives.filter((o) => o.status === "blocked");

  const lines: string[] = ["## Current Task State"];

  if (current) {
    lines.push(`\n**In Progress:** ${current.content}`);
  }

  if (completed.length > 0) {
    lines.push(`\n**Completed (${completed.length}):**`);
    for (const obj of completed.slice(-3)) {
      lines.push(`- [x] ${obj.content}`);
    }
  }

  if (pending.length > 0) {
    lines.push(`\n**Pending (${pending.length}):**`);
    for (const obj of pending.slice(0, 5)) {
      lines.push(`- [ ] ${obj.content}`);
    }
  }

  if (blocked.length > 0) {
    lines.push(`\n**Blocked (${blocked.length}):**`);
    for (const obj of blocked) {
      lines.push(`- [!] ${obj.content} (by: ${obj.blockedBy})`);
    }
  }

  lines.push("\n---\nContinue with the current task.");

  return lines.join("\n");
}

function estimateObjectivesTokens(objectives: Objective[]): number {
  let tokens = 50;
  for (const obj of objectives) {
    tokens += estimateTokens(obj.content) + 10;
  }
  return tokens;
}

function eventToMessage(event: ContextEvent): ModelMessage | null {
  switch (event.type) {
    case "user_message":
      return { role: "user", content: event.content };

    case "assistant_message":
      return { role: "assistant", content: event.content };

    case "tool_call": {
      const toolName = event.metadata?.toolName ?? "unknown";
      const args = event.content;
      return {
        role: "assistant",
        content: `[Tool Call: ${toolName}]\n${args}`,
      };
    }

    case "tool_result": {
      const toolName = event.metadata?.toolName ?? "unknown";
      return {
        role: "user",
        content: `[Tool Result: ${toolName}]\n${event.content}`,
      };
    }

    case "compaction_summary":
      return {
        role: "user",
        content: `## Previous Context Summary\n\n${event.content}`,
      };

    default:
      return null;
  }
}

export function appendUserMessage(
  context: BuiltContext,
  content: string
): BuiltContext {
  return {
    messages: [...context.messages, { role: "user", content }],
    tokenEstimate: context.tokenEstimate + estimateTokens(content),
    cacheBreakpoints: context.cacheBreakpoints,
  };
}

export function appendAssistantMessage(
  context: BuiltContext,
  content: string
): BuiltContext {
  return {
    messages: [...context.messages, { role: "assistant", content }],
    tokenEstimate: context.tokenEstimate + estimateTokens(content),
    cacheBreakpoints: context.cacheBreakpoints,
  };
}
