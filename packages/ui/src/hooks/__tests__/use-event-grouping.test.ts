import { describe, expect, it } from "bun:test";
import {
  type AgentEvent,
  groupEvents,
  isCanvasStatusEvent,
} from "../use-event-grouping";

function makeCanvasStatus(message: string, ts = 1): AgentEvent {
  return { type: "status", timestamp: ts, status: "canvas_tool", message };
}

function makeGenericStatus(message: string, ts = 1): AgentEvent {
  return { type: "status", timestamp: ts, status: "general", message };
}

function makeText(content: string): AgentEvent {
  return { type: "text", timestamp: 1, content, isPartial: false };
}

function makeToolCall(id: string, name: string): AgentEvent {
  return {
    type: "tool_call",
    timestamp: 1,
    toolCallId: id,
    toolName: name,
    displayName: name,
    toolInput: undefined,
    visibility: "visible" as const,
  };
}

function makeToolResult(id: string, name: string): AgentEvent {
  return {
    type: "tool_result",
    timestamp: 1,
    toolCallId: id,
    toolName: name,
    success: true,
  };
}

describe("isCanvasStatusEvent", () => {
  it("identifies canvas_tool status events", () => {
    expect(isCanvasStatusEvent(makeCanvasStatus("Adding node"))).toBe(true);
  });

  it("rejects non-canvas status events", () => {
    expect(isCanvasStatusEvent(makeGenericStatus("Processing"))).toBe(false);
  });

  it("rejects non-status events", () => {
    expect(isCanvasStatusEvent(makeText("hello"))).toBe(false);
  });
});

describe("canvas_progress grouping", () => {
  it("groups 2+ consecutive canvas_tool status events", () => {
    const events: AgentEvent[] = [
      makeCanvasStatus("Adding node"),
      makeCanvasStatus("Connecting nodes"),
      makeCanvasStatus("Validating"),
    ];

    const { groupedItems } = groupEvents(events, 3);

    expect(groupedItems).toHaveLength(1);
    expect(groupedItems[0]?.type).toBe("canvas_progress");
    if (groupedItems[0]?.type === "canvas_progress") {
      expect(groupedItems[0].events).toHaveLength(3);
    }
  });

  it("groups even a single canvas_tool status event", () => {
    const events: AgentEvent[] = [makeCanvasStatus("Adding node")];

    const { groupedItems } = groupEvents(events, 3);

    expect(groupedItems).toHaveLength(1);
    expect(groupedItems[0]?.type).toBe("canvas_progress");
    if (groupedItems[0]?.type === "canvas_progress") {
      expect(groupedItems[0].events).toHaveLength(1);
    }
  });

  it("breaks canvas group on text event", () => {
    const events: AgentEvent[] = [
      makeCanvasStatus("Adding node"),
      makeCanvasStatus("Connecting nodes"),
      makeText("Done building"),
      makeCanvasStatus("Validating"),
    ];

    const { groupedItems } = groupEvents(events, 3);

    const canvasGroups = groupedItems.filter(
      (i) => i.type === "canvas_progress"
    );
    expect(canvasGroups).toHaveLength(2);
    if (canvasGroups[0]?.type === "canvas_progress") {
      expect(canvasGroups[0].events).toHaveLength(2);
    }
    if (canvasGroups[1]?.type === "canvas_progress") {
      expect(canvasGroups[1].events).toHaveLength(1);
    }

    const singles = groupedItems.filter((i) => i.type === "single");
    expect(singles).toHaveLength(1);
  });

  it("breaks canvas group on tool_call event", () => {
    const events: AgentEvent[] = [
      makeCanvasStatus("Adding node"),
      makeCanvasStatus("Connecting nodes"),
      makeToolCall("tc1", "Read"),
      makeToolResult("tc1", "Read"),
      makeCanvasStatus("Validating"),
      makeCanvasStatus("Finishing"),
    ];

    const { groupedItems } = groupEvents(events, 3);

    const canvasGroups = groupedItems.filter(
      (i) => i.type === "canvas_progress"
    );
    expect(canvasGroups).toHaveLength(2);
  });

  it("does not group non-canvas status events", () => {
    const events: AgentEvent[] = [
      makeGenericStatus("Processing"),
      makeGenericStatus("Still processing"),
    ];

    const { groupedItems } = groupEvents(events, 3);

    expect(groupedItems).toHaveLength(2);
    expect(groupedItems.every((i) => i.type === "single")).toBe(true);
  });

  it("interleaves canvas progress with exploration tool groups", () => {
    const events: AgentEvent[] = [
      makeCanvasStatus("Adding node"),
      makeCanvasStatus("Connecting nodes"),
      makeToolCall("tc1", "Read"),
      makeToolResult("tc1", "Read"),
      makeToolCall("tc2", "Grep"),
      makeToolResult("tc2", "Grep"),
      makeToolCall("tc3", "Glob"),
      makeToolResult("tc3", "Glob"),
    ];

    const { groupedItems } = groupEvents(events, 3);

    expect(groupedItems[0]?.type).toBe("canvas_progress");
    expect(groupedItems[1]?.type).toBe("group");
  });
});
