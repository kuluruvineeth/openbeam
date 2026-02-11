import { describe, expect, it } from "bun:test";
import {
  isCanvasToolName,
  isEphemeralEvent,
  mapBuilderEventToPayload,
} from "../runtime-event-mapping";

describe("mapBuilderEventToPayload", () => {
  it("maps thinking to chat.thinking", () => {
    const result = mapBuilderEventToPayload({
      type: "thinking",
      content: "reasoning about search",
    });

    expect(result).toEqual({
      type: "chat.thinking",
      content: "reasoning about search",
    });
  });

  it("maps text to chat.assistant_delta", () => {
    const result = mapBuilderEventToPayload({
      type: "text",
      chunk: "Hello",
    });

    expect(result).toEqual({
      type: "chat.assistant_delta",
      chunk: "Hello",
    });
  });

  it("maps tool_call to tool.call_start", () => {
    const result = mapBuilderEventToPayload({
      type: "tool_call",
      tool: "canvas_add_node",
      input: { nodeType: "llm" },
      id: "tc_123",
    });

    expect(result).toEqual({
      type: "tool.call_start",
      toolCallId: "tc_123",
      toolName: "canvas_add_node",
      toolInput: { nodeType: "llm" },
    });
  });

  it("maps tool_result to tool.call_result", () => {
    const result = mapBuilderEventToPayload({
      type: "tool_result",
      id: "tc_123",
      result: { success: true },
    });

    expect(result).toEqual({
      type: "tool.call_result",
      toolCallId: "tc_123",
      toolName: "",
      toolOutput: { success: true },
      success: true,
    });
  });

  it("maps tool_result with tool name when mapping context exists", () => {
    const toolNameByCallId = new Map<string, string>([
      ["tc_456", "canvas_add_node"],
    ]);

    const result = mapBuilderEventToPayload(
      {
        type: "tool_result",
        id: "tc_456",
        result: { success: true },
      },
      { toolNameByCallId }
    );

    expect(result).toEqual({
      type: "tool.call_result",
      toolCallId: "tc_456",
      toolName: "canvas_add_node",
      toolOutput: { success: true },
      success: true,
    });
  });

  it("maps canvas_op to canvas.op_applied", () => {
    const op = {
      type: "add_node" as const,
      id: "n1",
      nodeType: "llm",
      timestamp: Date.now(),
      position: { x: 0, y: 0 },
    };

    const result = mapBuilderEventToPayload({
      type: "canvas_op",
      operation: op,
    });

    expect(result).toEqual({
      type: "canvas.op_applied",
      operation: op,
    });
  });

  it("returns null for error events", () => {
    expect(
      mapBuilderEventToPayload({ type: "error", message: "fail" })
    ).toBeNull();
  });

  it("returns null for complete events", () => {
    expect(
      mapBuilderEventToPayload({
        type: "complete",
        summary: "done",
        result: { output: "" } as never,
      })
    ).toBeNull();
  });
});

describe("canvas tool context tracking", () => {
  it("tracks activeCanvasToolCallId on canvas tool_call", () => {
    const context = { toolNameByCallId: new Map<string, string>() };

    mapBuilderEventToPayload(
      { type: "tool_call", tool: "canvas_add_node", input: {}, id: "tc_1" },
      context
    );

    expect(context.activeCanvasToolCallId).toBe("tc_1");
  });

  it("does not set activeCanvasToolCallId for non-canvas tools", () => {
    const context = { toolNameByCallId: new Map<string, string>() };

    mapBuilderEventToPayload(
      { type: "tool_call", tool: "search_hybrid", input: {}, id: "tc_2" },
      context
    );

    expect(context.activeCanvasToolCallId).toBeUndefined();
  });

  it("clears activeCanvasToolCallId on matching tool_result", () => {
    const context = {
      toolNameByCallId: new Map<string, string>([["tc_3", "canvas_add_node"]]),
      activeCanvasToolCallId: "tc_3",
    };

    mapBuilderEventToPayload(
      { type: "tool_result", id: "tc_3", result: {} },
      context
    );

    expect(context.activeCanvasToolCallId).toBeUndefined();
  });

  it("preserves activeCanvasToolCallId on non-matching tool_result", () => {
    const context = {
      toolNameByCallId: new Map<string, string>([["tc_4", "search_hybrid"]]),
      activeCanvasToolCallId: "tc_active",
    };

    mapBuilderEventToPayload(
      { type: "tool_result", id: "tc_4", result: {} },
      context
    );

    expect(context.activeCanvasToolCallId).toBe("tc_active");
  });

  it("threads toolCallId into add_node canvas operations", () => {
    const context = {
      toolNameByCallId: new Map<string, string>(),
      activeCanvasToolCallId: "tc_5",
    };

    const result = mapBuilderEventToPayload(
      {
        type: "canvas_op",
        operation: {
          type: "add_node",
          id: "n1",
          nodeType: "llm",
          timestamp: 1000,
        },
      },
      context
    );

    expect(result).toEqual({
      type: "canvas.op_applied",
      operation: {
        type: "add_node",
        id: "n1",
        nodeType: "llm",
        timestamp: 1000,
        toolCallId: "tc_5",
      },
    });
  });

  it("does not thread toolCallId for non-add_node operations", () => {
    const context = {
      toolNameByCallId: new Map<string, string>(),
      activeCanvasToolCallId: "tc_6",
    };

    const op = {
      type: "remove_node" as const,
      id: "n1",
      timestamp: 1000,
    };

    const result = mapBuilderEventToPayload(
      { type: "canvas_op", operation: op },
      context
    );

    expect(result).toEqual({
      type: "canvas.op_applied",
      operation: op,
    });
  });

  it("does not thread toolCallId without active canvas tool", () => {
    const context = { toolNameByCallId: new Map<string, string>() };

    const op = {
      type: "add_node" as const,
      id: "n1",
      nodeType: "llm",
      timestamp: 1000,
    };

    const result = mapBuilderEventToPayload(
      { type: "canvas_op", operation: op },
      context
    );

    expect(result).toEqual({
      type: "canvas.op_applied",
      operation: op,
    });
  });
});

describe("isCanvasToolName", () => {
  it("returns true for any canvas_ prefixed tool", () => {
    expect(isCanvasToolName("canvas_add_node")).toBe(true);
    expect(isCanvasToolName("canvas_connect_nodes")).toBe(true);
    expect(isCanvasToolName("canvas_remove_node")).toBe(true);
    expect(isCanvasToolName("canvas_validate")).toBe(true);
    expect(isCanvasToolName("canvas_future_tool")).toBe(true);
  });

  it("returns false for non-canvas tools", () => {
    expect(isCanvasToolName("search_hybrid")).toBe(false);
    expect(isCanvasToolName("doc_get")).toBe(false);
    expect(isCanvasToolName("rag_answer")).toBe(false);
    expect(isCanvasToolName("")).toBe(false);
  });
});

describe("isEphemeralEvent", () => {
  it("identifies assistant_delta as ephemeral", () => {
    expect(isEphemeralEvent("chat.assistant_delta")).toBe(true);
  });

  it("identifies thinking as ephemeral", () => {
    expect(isEphemeralEvent("chat.thinking")).toBe(true);
  });

  it("identifies execution.progress as ephemeral", () => {
    expect(isEphemeralEvent("execution.progress")).toBe(true);
  });

  it("identifies tool.call_start as durable", () => {
    expect(isEphemeralEvent("tool.call_start")).toBe(false);
  });

  it("identifies chat.user_message as durable", () => {
    expect(isEphemeralEvent("chat.user_message")).toBe(false);
  });

  it("identifies canvas.op_applied as durable", () => {
    expect(isEphemeralEvent("canvas.op_applied")).toBe(false);
  });

  it("identifies chat.assistant_final as durable", () => {
    expect(isEphemeralEvent("chat.assistant_final")).toBe(false);
  });
});
