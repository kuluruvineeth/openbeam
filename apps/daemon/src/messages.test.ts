import { describe, expect, test } from "vitest";

import type { AgentStreamEvent } from "./agent/agent-sdk-types.js";
import {
  SessionInboundMessageSchema,
  SessionOutboundMessageSchema,
  serializeAgentStreamEvent,
} from "./messages.js";

describe("serializeAgentStreamEvent", () => {
  test("preserves user_message text as-is", () => {
    const event: AgentStreamEvent = {
      type: "timeline",
      provider: "claude",
      item: {
        type: "user_message",
        text: "<openplane-instructions>\nX\n</openplane-instructions>\n\nHello",
        messageId: "m1",
      },
    };

    const serialized = serializeAgentStreamEvent(event);
    expect(serialized).not.toBeNull();
    if (
      !serialized ||
      serialized.type !== "timeline" ||
      serialized.item.type !== "user_message"
    ) {
      throw new Error("Expected timeline.user_message event");
    }
    expect(serialized.item.text).toBe(event.item.text);
    expect(serialized.item.messageId).toBe("m1");
  });

  test("passes canonical tool_call payloads through unchanged", () => {
    const event: AgentStreamEvent = {
      type: "timeline",
      provider: "codex",
      item: {
        type: "tool_call",
        callId: "call_1",
        name: "shell",
        status: "running",
        detail: {
          type: "shell",
          command: "pwd",
        },
        error: null,
      },
    };

    const serialized = serializeAgentStreamEvent(event);
    expect(serialized).not.toBeNull();
    if (
      !serialized ||
      serialized.type !== "timeline" ||
      serialized.item.type !== "tool_call"
    ) {
      throw new Error("Expected timeline.tool_call event");
    }
    expect(serialized.item.status).toBe("running");
    expect(serialized.item.error).toBeNull();
  });

  test("passes unknown-detail tool_call payloads through unchanged", () => {
    const event: AgentStreamEvent = {
      type: "timeline",
      provider: "codex",
      item: {
        type: "tool_call",
        callId: "call_unknown",
        name: "openplane_voice.speak",
        status: "completed",
        detail: {
          type: "unknown",
          input: { text: "hello" },
          output: { ok: true },
        },
        error: null,
      },
    };

    const serialized = serializeAgentStreamEvent(event);
    expect(serialized).not.toBeNull();
    if (
      !serialized ||
      serialized.type !== "timeline" ||
      serialized.item.type !== "tool_call"
    ) {
      throw new Error("Expected timeline.tool_call event");
    }
    expect(serialized.item.detail).toEqual({
      type: "unknown",
      input: { text: "hello" },
      output: { ok: true },
    });
  });

  test("drops invalid legacy tool_call items", () => {
    const event = {
      type: "timeline",
      provider: "codex",
      item: {
        type: "tool_call",
        callId: "call_legacy",
        name: "shell",
        status: "inProgress",
        detail: {
          type: "unknown",
          input: { command: "pwd" },
          output: null,
        },
      },
    } satisfies unknown;

    const serialized = serializeAgentStreamEvent(event as AgentStreamEvent);
    expect(serialized).toBeNull();
  });

  test("parses native helper call requests", () => {
    const parsed = SessionInboundMessageSchema.parse({
      type: "native_helper_call_request",
      requestId: "native-helper-1",
      method: "setShortcuts",
      params: {
        pushToTalk: [57],
        toggleRecording: [58],
        pasteLastTranscript: [59],
        newNote: [60],
      },
    });

    expect(parsed.type).toBe("native_helper_call_request");
    expect(parsed.method).toBe("setShortcuts");
    expect(parsed.params.pushToTalk).toEqual([57]);
  });

  test("normalizes native helper pasteText params to transcript", () => {
    const parsed = SessionInboundMessageSchema.parse({
      type: "native_helper_call_request",
      requestId: "native-helper-2",
      method: "pasteText",
      params: {
        text: "hello from legacy client",
      },
    });

    expect(parsed.type).toBe("native_helper_call_request");
    expect(parsed.method).toBe("pasteText");
    if (parsed.method !== "pasteText") {
      throw new Error("Expected pasteText request");
    }
    expect(parsed.params).toEqual({ transcript: "hello from legacy client" });
  });

  test("parses native helper event outbound messages", () => {
    const parsed = SessionOutboundMessageSchema.parse({
      type: "native_helper_event",
      payload: {
        type: "keyDown",
        payload: {
          keyCode: 42,
        },
      },
    });

    expect(parsed.type).toBe("native_helper_event");
    expect(parsed.payload.type).toBe("keyDown");
    expect(parsed.payload.payload.keyCode).toBe(42);
  });
});
