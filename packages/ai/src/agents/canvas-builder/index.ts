import type { CanvasOperation } from "@openplane/types/canvas";
import type { AgentStreamChunk } from "../base";
import type {
  AgentExecutionContext,
  AgentExecutionResult,
  LlmAgentConfig,
} from "../config";
import { LlmAgent } from "../patterns/llm-agent";
import { canvasBuilderConfig, createCanvasBuilderConfig } from "./config";

export type CanvasStreamEvent =
  | { type: "thinking"; content: string }
  | { type: "tool_call"; tool: string; input: unknown; id: string }
  | { type: "tool_result"; id: string; result: unknown }
  | { type: "canvas_op"; operation: CanvasOperation }
  | { type: "text"; chunk: string }
  | { type: "error"; message: string }
  | { type: "complete"; summary: string; result: AgentExecutionResult };

export class CanvasBuilderAgent extends LlmAgent {
  constructor(configOverrides?: Partial<LlmAgentConfig>) {
    super(
      configOverrides
        ? createCanvasBuilderConfig(configOverrides)
        : canvasBuilderConfig
    );
  }

  async *streamCanvas(
    prompt: string,
    ctx: AgentExecutionContext
  ): AsyncGenerator<CanvasStreamEvent> {
    try {
      for await (const chunk of this.stream(prompt, ctx)) {
        const event = this.transformChunk(chunk);
        if (event) {
          yield event;
        }

        const canvasOp = this.extractCanvasOperation(chunk);
        if (canvasOp) {
          yield { type: "canvas_op", operation: canvasOp };
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      yield { type: "error", message };
      return;
    }
  }

  private transformChunk(chunk: AgentStreamChunk): CanvasStreamEvent | null {
    switch (chunk.type) {
      case "thinking": {
        if (!chunk.content) {
          return null;
        }
        return { type: "thinking", content: chunk.content };
      }

      case "text": {
        if (!chunk.content) {
          return null;
        }
        return { type: "text", chunk: chunk.content };
      }

      case "tool-call": {
        if (!(chunk.toolName && chunk.toolCallId)) {
          return null;
        }
        return {
          type: "tool_call",
          tool: chunk.toolName,
          input: chunk.toolInput,
          id: chunk.toolCallId,
        };
      }

      case "tool-result": {
        if (!chunk.toolCallId) {
          return null;
        }
        return {
          type: "tool_result",
          id: chunk.toolCallId,
          result: chunk.toolOutput,
        };
      }

      case "done": {
        if (!chunk.result) {
          return null;
        }
        return {
          type: "complete",
          summary: "Workflow created successfully",
          result: chunk.result,
        };
      }

      default:
        return null;
    }
  }

  private extractCanvasOperation(
    chunk: AgentStreamChunk
  ): CanvasOperation | null {
    if (chunk.type !== "tool-result") {
      return null;
    }

    if (!chunk.toolName?.startsWith("canvas_")) {
      return null;
    }

    const output = chunk.toolOutput;
    if (!output || typeof output !== "object") {
      return null;
    }

    const obj = output as Record<string, unknown>;
    const dataObj =
      typeof obj.data === "object" && obj.data !== null
        ? (obj.data as Record<string, unknown>)
        : null;

    const operation = dataObj?.operation ?? obj.operation;
    if (!operation || typeof operation !== "object") {
      return null;
    }

    return operation as CanvasOperation;
  }
}

export function createCanvasBuilderAgent(
  configOverrides?: Partial<LlmAgentConfig>
): CanvasBuilderAgent {
  return new CanvasBuilderAgent(configOverrides);
}

export async function* streamCanvasBuilder(
  prompt: string,
  ctx: AgentExecutionContext,
  configOverrides?: Partial<LlmAgentConfig>
): AsyncGenerator<CanvasStreamEvent> {
  const agent = createCanvasBuilderAgent(configOverrides);
  for await (const event of agent.streamCanvas(prompt, ctx)) {
    yield event;
  }
}

export {
  CANVAS_BUILDER_TOOLS,
  canvasBuilderConfig,
  createCanvasBuilderConfig,
} from "./config";
export { CANVAS_BUILDER_PROMPT } from "./prompts";
