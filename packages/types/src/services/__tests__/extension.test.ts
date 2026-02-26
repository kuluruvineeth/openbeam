import { describe, expect, it } from "bun:test";
import {
  ExtensionActionExecutionSchema,
  ExtensionActionProposalSchema,
} from "../extension/actions";
import {
  ExtensionInboundMessageSchema,
  ExtensionOutboundMessageSchema,
} from "../extension/messages";
import {
  ExtensionHostPolicyDecisionSchema,
  ExtensionHostPolicySchema,
} from "../extension/policy";
import {
  ExtensionChatSubmitRequestSchema,
  ExtensionChatSubmitResponseSchema,
} from "../extension/rpc";

describe("extension action schemas", () => {
  it("parses a valid action proposal", () => {
    const proposal = ExtensionActionProposalSchema.parse({
      actionId: "action-1",
      sessionId: "session-1",
      toolName: "content.extract",
      kind: "extract",
      summary: "Extract key information from the current page",
      risk: "low",
      requiresApproval: false,
    });

    expect(proposal.actionId).toBe("action-1");
    expect(proposal.input).toEqual({});
  });

  it("rejects unsupported action kinds", () => {
    expect(() =>
      ExtensionActionProposalSchema.parse({
        actionId: "action-1",
        sessionId: "session-1",
        toolName: "content.extract",
        kind: "unknown",
        summary: "Invalid action kind",
      })
    ).toThrow();
  });

  it("parses action execution artifacts", () => {
    const execution = ExtensionActionExecutionSchema.parse({
      executionId: "exec-1",
      actionId: "action-1",
      status: "succeeded",
      startedAtMs: 1,
      completedAtMs: 2,
      artifact: {
        url: "https://example.com",
      },
    });

    expect(execution.status).toBe("succeeded");
    expect(execution.artifact).toEqual({ url: "https://example.com" });
  });
});

describe("extension policy schemas", () => {
  it("applies host policy defaults", () => {
    const policy = ExtensionHostPolicySchema.parse({});
    expect(policy.defaultMode).toBe("ask");
    expect(policy.rules).toEqual([]);
  });

  it("parses host policy decision", () => {
    const decision = ExtensionHostPolicyDecisionSchema.parse({
      hostname: "example.com",
      mode: "allow",
      evaluatedAtMs: 1,
    });

    expect(decision.hostname).toBe("example.com");
    expect(decision.mode).toBe("allow");
  });
});

describe("extension runtime message schemas", () => {
  it("parses sidepanel chat submit message", () => {
    const message = ExtensionInboundMessageSchema.parse({
      type: "extension/chat.submit",
      requestId: "req-1",
      sentAtMs: 123,
      source: "sidepanel",
      payload: {
        sessionId: "session-1",
        prompt: "Summarize this page",
        pageContext: {
          url: "https://example.com",
          title: "Example",
        },
      },
    });

    expect(message.type).toBe("extension/chat.submit");
    if (message.type !== "extension/chat.submit") {
      throw new Error("Expected extension/chat.submit message");
    }
    expect(message.payload.prompt).toBe("Summarize this page");
  });

  it("rejects sidepanel chat submit without prompt", () => {
    const result = ExtensionInboundMessageSchema.safeParse({
      type: "extension/chat.submit",
      requestId: "req-1",
      sentAtMs: 123,
      source: "sidepanel",
      payload: {
        sessionId: "session-1",
        prompt: "",
      },
    });

    expect(result.success).toBe(false);
  });

  it("parses background action proposal response", () => {
    const response = ExtensionOutboundMessageSchema.parse({
      type: "extension/action.proposed",
      requestId: "req-1",
      sentAtMs: 123,
      source: "background",
      payload: {
        proposal: {
          actionId: "action-1",
          sessionId: "session-1",
          toolName: "content.extract",
          kind: "extract",
          summary: "Extract key information from the page",
          risk: "low",
          requiresApproval: false,
        },
      },
    });

    expect(response.type).toBe("extension/action.proposed");
    if (response.type !== "extension/action.proposed") {
      throw new Error("Expected extension/action.proposed response");
    }
    expect(response.payload.proposal.toolName).toBe("content.extract");
  });
});

describe("extension rpc schemas", () => {
  it("parses chat submit request payload", () => {
    const request = ExtensionChatSubmitRequestSchema.parse({
      sessionId: "session-1",
      prompt: "Summarize this page",
      pageContext: {
        url: "https://example.com",
        title: "Example page",
      },
    });

    expect(request.sessionId).toBe("session-1");
    expect(request.prompt).toBe("Summarize this page");
  });

  it("parses chat submit response payload", () => {
    const response = ExtensionChatSubmitResponseSchema.parse({
      proposal: {
        actionId: "action-1",
        sessionId: "session-1",
        toolName: "content.extract",
        kind: "extract",
        summary: "Extract key information",
        risk: "low",
        requiresApproval: false,
      },
    });

    expect(response.proposal.kind).toBe("extract");
  });
});
