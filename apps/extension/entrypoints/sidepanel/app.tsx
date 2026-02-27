import type {
  ExtensionActionExecution,
  ExtensionActionProposal,
} from "@openplane/types/services/extension/actions";
import {
  ExtensionInboundMessageSchema,
  ExtensionOutboundMessageSchema,
  type ExtensionRuntimeMessage,
} from "@openplane/types/services/extension/messages";
import { useReducer } from "react";
import { browser } from "wxt/browser";
import {
  type ActionQueueItem,
  createInitialSidepanelState,
  sidepanelReducer,
} from "./state";

function nowMs(): number {
  return Date.now();
}

function createRequestId(): string {
  return crypto.randomUUID();
}

async function getActivePageContext() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (!activeTab?.url) {
    return;
  }

  return {
    url: activeTab.url,
    title: activeTab.title ?? undefined,
  };
}

export function App() {
  const [state, dispatch] = useReducer(
    sidepanelReducer,
    createRequestId(),
    createInitialSidepanelState
  );
  const latestQueueItem: ActionQueueItem | null = state.queue[0] ?? null;

  async function sendMessage(
    rawMessage: unknown
  ): Promise<ExtensionRuntimeMessage> {
    const inbound = ExtensionInboundMessageSchema.parse(rawMessage);
    const rawResponse = await browser.runtime.sendMessage(inbound);
    const parsed = ExtensionOutboundMessageSchema.safeParse(rawResponse);

    if (!parsed.success) {
      throw new Error("Background response failed schema validation.");
    }

    return parsed.data;
  }

  async function ping() {
    dispatch({ type: "clear_error" });
    dispatch({ type: "set_status", status: "Pinging background..." });

    try {
      const response = await sendMessage({
        type: "extension/ping",
        requestId: createRequestId(),
        sentAtMs: nowMs(),
        source: "sidepanel",
        payload: {},
      });

      if (response.type === "extension/pong") {
        dispatch({
          type: "set_status",
          status: `Connected (v${response.payload.version})`,
        });
        return;
      }

      dispatch({ type: "set_status", status: "Background reachable" });
    } catch (caughtError: unknown) {
      dispatch({ type: "set_status", status: "Ping failed" });
      dispatch({
        type: "set_error",
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to ping extension background.",
      });
    }
  }

  async function submitPrompt() {
    if (!state.prompt.trim()) {
      return;
    }

    dispatch({ type: "clear_error" });
    dispatch({ type: "set_status", status: "Submitting prompt..." });
    dispatch({ type: "stream_started" });

    try {
      const pageContext = await getActivePageContext();
      const response = await sendMessage({
        type: "extension/chat.submit",
        requestId: createRequestId(),
        sentAtMs: nowMs(),
        source: "sidepanel",
        payload: {
          sessionId: state.sessionId,
          prompt: state.prompt.trim(),
          pageContext,
        },
      });

      if (response.type === "extension/action.proposed") {
        dispatch({
          type: "action_proposed",
          proposal: response.payload.proposal,
        });
        dispatch({ type: "set_status", status: "Action proposed" });
        dispatch({ type: "stream_finished" });
        return;
      }

      if (response.type === "extension/error") {
        dispatch({ type: "set_status", status: "Request rejected" });
        dispatch({ type: "set_error", error: response.payload.message });
        dispatch({ type: "stream_finished" });
        return;
      }

      dispatch({ type: "set_status", status: "Received response" });
      dispatch({ type: "stream_finished" });
    } catch (caughtError: unknown) {
      dispatch({ type: "set_status", status: "Request failed" });
      dispatch({
        type: "set_error",
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to send prompt to background.",
      });
      dispatch({ type: "stream_finished" });
    }
  }

  async function updateAction(behavior: "approve" | "reject") {
    const proposal = latestQueueItem?.proposal;
    if (!proposal) {
      return;
    }

    dispatch({ type: "clear_error" });
    dispatch({
      type: "set_status",
      status:
        behavior === "approve" ? "Approving action..." : "Rejecting action...",
    });

    const type =
      behavior === "approve"
        ? "extension/action.approve"
        : "extension/action.reject";

    const payload =
      behavior === "approve"
        ? {
            actionId: proposal.actionId,
            sessionId: proposal.sessionId,
          }
        : {
            actionId: proposal.actionId,
            sessionId: proposal.sessionId,
            reason: "Rejected in side panel.",
          };

    try {
      const response = await sendMessage({
        type,
        requestId: createRequestId(),
        sentAtMs: nowMs(),
        source: "sidepanel",
        payload,
      });

      if (response.type === "extension/action.status") {
        dispatch({
          type: "action_status",
          execution: response.payload.execution,
        });
        dispatch({
          type: "set_status",
          status: `Action ${response.payload.execution.status}`,
        });
        return;
      }

      if (response.type === "extension/error") {
        dispatch({ type: "set_status", status: "Action update failed" });
        dispatch({ type: "set_error", error: response.payload.message });
      }
    } catch (caughtError: unknown) {
      dispatch({ type: "set_status", status: "Action update failed" });
      dispatch({
        type: "set_error",
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to update action approval state.",
      });
    }
  }

  const activeProposal: ExtensionActionProposal | null =
    latestQueueItem?.proposal ?? null;
  const activeExecution: ExtensionActionExecution | null =
    latestQueueItem?.execution ?? null;
  const streamText = state.stream.chunks.join("");

  return (
    <main
      style={{
        fontFamily:
          "ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        padding: "12px",
        color: "#111827",
        background: "#f9fafb",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
        OpenPlane
      </h1>
      <p style={{ margin: "6px 0 12px", fontSize: "12px", color: "#4b5563" }}>
        {state.status}
      </p>

      <button
        onClick={ping}
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          padding: "6px 10px",
          background: "#ffffff",
          fontSize: "12px",
          cursor: "pointer",
        }}
        type="button"
      >
        Ping background
      </button>

      <div style={{ marginTop: "12px" }}>
        <textarea
          onChange={(event) =>
            dispatch({ type: "set_prompt", prompt: event.target.value })
          }
          placeholder="Ask OpenPlane to inspect this page..."
          style={{
            width: "100%",
            minHeight: "84px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            padding: "8px",
            fontSize: "12px",
            resize: "vertical",
            boxSizing: "border-box",
          }}
          value={state.prompt}
        />
      </div>

      <button
        onClick={submitPrompt}
        style={{
          marginTop: "8px",
          border: "1px solid #111827",
          borderRadius: "6px",
          padding: "7px 10px",
          background: "#111827",
          color: "#ffffff",
          fontSize: "12px",
          cursor: "pointer",
        }}
        type="button"
      >
        Submit prompt
      </button>

      {activeProposal ? (
        <section
          style={{
            marginTop: "12px",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            background: "#ffffff",
          }}
        >
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 600 }}>
            Proposed action
          </p>
          <p style={{ margin: "6px 0 0", fontSize: "12px" }}>
            {activeProposal.summary}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#6b7280" }}>
            Tool: {activeProposal.toolName} | Risk: {activeProposal.risk}
          </p>

          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <button
              onClick={async () => {
                await updateAction("approve");
              }}
              style={{
                border: "1px solid #16a34a",
                borderRadius: "6px",
                padding: "6px 10px",
                background: "#16a34a",
                color: "#ffffff",
                fontSize: "12px",
                cursor: "pointer",
              }}
              type="button"
            >
              Approve
            </button>

            <button
              onClick={async () => {
                await updateAction("reject");
              }}
              style={{
                border: "1px solid #dc2626",
                borderRadius: "6px",
                padding: "6px 10px",
                background: "#ffffff",
                color: "#dc2626",
                fontSize: "12px",
                cursor: "pointer",
              }}
              type="button"
            >
              Reject
            </button>
          </div>
        </section>
      ) : null}

      {activeExecution ? (
        <section
          style={{
            marginTop: "12px",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            background: "#ffffff",
          }}
        >
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 600 }}>
            Execution status: {activeExecution.status}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#6b7280" }}>
            Execution ID: {activeExecution.executionId}
          </p>
        </section>
      ) : null}

      {state.stream.isStreaming || streamText ? (
        <section
          style={{
            marginTop: "12px",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            background: "#ffffff",
          }}
        >
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 600 }}>Stream</p>
          <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#374151" }}>
            {streamText ||
              (state.stream.isStreaming ? "Receiving..." : "No chunks")}
          </p>
        </section>
      ) : null}

      {state.error ? (
        <p style={{ marginTop: "12px", color: "#dc2626", fontSize: "12px" }}>
          {state.error}
        </p>
      ) : null}
    </main>
  );
}
