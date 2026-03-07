import {
  type ExtensionActionExecution,
  ExtensionActionExecutionSchema,
  type ExtensionActionProposal,
} from "@openbeam/types/services/extension/actions";
import {
  ExtensionInboundMessageSchema,
  ExtensionOutboundMessageSchema,
  type ExtensionPageContext,
} from "@openbeam/types/services/extension/messages";
import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";

function nowMs(): number {
  return Date.now();
}

function createRequestId(): string {
  return crypto.randomUUID();
}

function collectPageContext(): ExtensionPageContext {
  const selectionText = window.getSelection()?.toString().trim();

  return {
    url: window.location.href,
    title: document.title || undefined,
    selectionText: selectionText ? selectionText.slice(0, 8000) : undefined,
  };
}

function executeAction(
  proposal: ExtensionActionProposal
): ExtensionActionExecution {
  const startedAtMs = nowMs();

  if (proposal.kind !== "extract" && proposal.kind !== "read_dom") {
    return ExtensionActionExecutionSchema.parse({
      executionId: createRequestId(),
      actionId: proposal.actionId,
      status: "failed",
      startedAtMs,
      completedAtMs: nowMs(),
      error: {
        code: "unsupported_action",
        message: `Unsupported action kind: ${proposal.kind}`,
      },
    });
  }

  const bodyText = document.body?.innerText?.trim() ?? "";
  const artifact = {
    url: window.location.href,
    title: document.title,
    excerpt: bodyText.slice(0, 4000),
  };

  return ExtensionActionExecutionSchema.parse({
    executionId: createRequestId(),
    actionId: proposal.actionId,
    status: "succeeded",
    startedAtMs,
    completedAtMs: nowMs(),
    artifact,
  });
}

async function handleBackgroundMessage(rawMessage: unknown): Promise<void> {
  const parsed = ExtensionOutboundMessageSchema.safeParse(rawMessage);
  if (!parsed.success) {
    return;
  }

  const message = parsed.data;
  if (message.type === "extension/content.request_context") {
    const outbound = ExtensionInboundMessageSchema.parse({
      type: "extension/content.context",
      requestId: message.requestId,
      sentAtMs: nowMs(),
      source: "content",
      payload: {
        pageContext: collectPageContext(),
      },
    });
    await browser.runtime.sendMessage(outbound);
    return;
  }

  if (message.type === "extension/content.execute_action") {
    const execution = executeAction(message.payload.proposal);
    const outbound = ExtensionInboundMessageSchema.parse({
      type: "extension/content.execution_result",
      requestId: message.requestId,
      sentAtMs: nowMs(),
      source: "content",
      payload: {
        execution,
      },
    });
    await browser.runtime.sendMessage(outbound);
  }
}

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  runAt: "document_idle",
  main() {
    browser.runtime.onMessage.addListener((rawMessage) =>
      handleBackgroundMessage(rawMessage)
    );
  },
});
