import {
  type ExtensionActionExecution,
  ExtensionActionExecutionSchema,
} from "@openbeam/types/services/extension/actions";
import {
  ExtensionInboundMessageSchema,
  type ExtensionOutboundMessage,
  ExtensionOutboundMessageSchema,
} from "@openbeam/types/services/extension/messages";
import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { submitExtensionChatRpc } from "../src/lib/server-client";

const EXTENSION_VERSION = "0.1.0";

function nowMs(): number {
  return Date.now();
}

function createRequestId(): string {
  return crypto.randomUUID();
}

function createErrorResponse(
  requestId: string,
  message: string,
  code: "invalid_request" | "unsupported_operation" | "internal_error"
): ExtensionOutboundMessage {
  return ExtensionOutboundMessageSchema.parse({
    type: "extension/error",
    requestId,
    sentAtMs: nowMs(),
    source: "background",
    payload: {
      code,
      message,
    },
  });
}

function createExecution(
  actionId: string,
  status: ExtensionActionExecution["status"]
): ExtensionActionExecution {
  return ExtensionActionExecutionSchema.parse({
    executionId: createRequestId(),
    actionId,
    status,
    startedAtMs: nowMs(),
    completedAtMs: nowMs(),
  });
}

async function handleMessage(
  rawMessage: unknown
): Promise<ExtensionOutboundMessage> {
  const parsed = ExtensionInboundMessageSchema.safeParse(rawMessage);
  if (!parsed.success) {
    return createErrorResponse(
      createRequestId(),
      "Message failed schema validation.",
      "invalid_request"
    );
  }

  const message = parsed.data;
  const requestId = message.requestId;
  switch (message.type) {
    case "extension/ping":
      return ExtensionOutboundMessageSchema.parse({
        type: "extension/pong",
        requestId,
        sentAtMs: nowMs(),
        source: "background",
        payload: {
          version: EXTENSION_VERSION,
        },
      });
    case "extension/chat.submit": {
      if (message.payload.hostDecision?.mode === "block") {
        return createErrorResponse(
          requestId,
          "This host is blocked by extension policy.",
          "unsupported_operation"
        );
      }

      try {
        const response = await submitExtensionChatRpc({
          sessionId: message.payload.sessionId,
          prompt: message.payload.prompt,
          pageContext: message.payload.pageContext,
          hostDecision: message.payload.hostDecision,
        });

        return ExtensionOutboundMessageSchema.parse({
          type: "extension/action.proposed",
          requestId,
          sentAtMs: nowMs(),
          source: "background",
          payload: {
            proposal: response.proposal,
          },
        });
      } catch (error) {
        const messageText =
          error instanceof Error
            ? error.message
            : "Failed to reach OpenBeam server";

        return createErrorResponse(requestId, messageText, "internal_error");
      }
    }
    case "extension/action.approve": {
      const execution = createExecution(message.payload.actionId, "approved");
      return ExtensionOutboundMessageSchema.parse({
        type: "extension/action.status",
        requestId,
        sentAtMs: nowMs(),
        source: "background",
        payload: {
          execution,
        },
      });
    }
    case "extension/action.reject": {
      const execution = createExecution(message.payload.actionId, "rejected");
      return ExtensionOutboundMessageSchema.parse({
        type: "extension/action.status",
        requestId,
        sentAtMs: nowMs(),
        source: "background",
        payload: {
          execution,
        },
      });
    }
    case "extension/content.context":
    case "extension/content.execution_result":
      return ExtensionOutboundMessageSchema.parse({
        type: "extension/ack",
        requestId,
        sentAtMs: nowMs(),
        source: "background",
        payload: {
          acknowledgedType: message.type,
        },
      });
    default:
      return createErrorResponse(
        requestId,
        "Unsupported message type.",
        "unsupported_operation"
      );
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    const sidePanel = globalThis.chrome?.sidePanel;
    if (!sidePanel) {
      return;
    }

    sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error: unknown) =>
        console.error("Failed to configure side panel behavior.", error)
      );
  });

  browser.runtime.onMessage.addListener((rawMessage) =>
    handleMessage(rawMessage)
  );
});
