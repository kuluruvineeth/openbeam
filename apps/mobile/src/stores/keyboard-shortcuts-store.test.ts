import { beforeEach, describe, expect, it } from "vitest";

import { useKeyboardShortcutsStore } from "./keyboard-shortcuts-store";

function resetKeyboardShortcutsStore(): void {
  useKeyboardShortcutsStore.setState(
    {
      commandCenterOpen: false,
      shortcutsDialogOpen: false,
      altDown: false,
      cmdOrCtrlDown: false,
      sidebarShortcutAgentKeys: [],
      messageInputActionRequest: null,
      messageInputActionQueue: [],
      messageInputActionNextId: 0,
      dictationActivity: {
        agentKey: null,
        isRecording: false,
        isProcessing: false,
        updatedAtMs: 0,
        lastReporterAgentKey: null,
      },
    },
    false
  );
}

beforeEach(() => {
  resetKeyboardShortcutsStore();
});

describe("keyboard-shortcuts-store message input queue", () => {
  it("queues multiple actions without dropping earlier requests", () => {
    const store = useKeyboardShortcutsStore.getState();
    store.requestMessageInputAction({
      agentKey: "srv-1:agent-1",
      kind: "dictation-start",
    });
    store.requestMessageInputAction({
      agentKey: "srv-1:agent-1",
      kind: "dictation-stop",
    });

    const current =
      useKeyboardShortcutsStore.getState().messageInputActionRequest;
    const queue = useKeyboardShortcutsStore.getState().messageInputActionQueue;

    expect(current?.kind).toBe("dictation-start");
    expect(queue).toHaveLength(1);
    expect(queue[0]?.kind).toBe("dictation-stop");
  });

  it("promotes queued request when current request is cleared", () => {
    const store = useKeyboardShortcutsStore.getState();
    store.requestMessageInputAction({
      agentKey: "srv-1:agent-1",
      kind: "dictation-start",
    });
    store.requestMessageInputAction({
      agentKey: "srv-1:agent-1",
      kind: "dictation-stop",
    });

    const firstId =
      useKeyboardShortcutsStore.getState().messageInputActionRequest?.id;
    expect(typeof firstId).toBe("number");
    store.clearMessageInputActionRequest(firstId as number);

    const promoted =
      useKeyboardShortcutsStore.getState().messageInputActionRequest;
    expect(promoted?.kind).toBe("dictation-stop");
    expect(
      useKeyboardShortcutsStore.getState().messageInputActionQueue
    ).toHaveLength(0);
  });
});

describe("keyboard-shortcuts-store dictation activity", () => {
  it("tracks active dictation state for an agent", () => {
    const store = useKeyboardShortcutsStore.getState();

    store.reportDictationActivity({
      agentKey: "srv-1:agent-1",
      isRecording: true,
      isProcessing: false,
      nowMs: 1000,
    });

    const activity = useKeyboardShortcutsStore.getState().dictationActivity;
    expect(activity).toEqual({
      agentKey: "srv-1:agent-1",
      isRecording: true,
      isProcessing: false,
      updatedAtMs: 1000,
      lastReporterAgentKey: "srv-1:agent-1",
    });
  });

  it("clears dictation state when the same agent reports inactive", () => {
    const store = useKeyboardShortcutsStore.getState();

    store.reportDictationActivity({
      agentKey: "srv-1:agent-1",
      isRecording: false,
      isProcessing: true,
      nowMs: 1000,
    });
    store.reportDictationActivity({
      agentKey: "srv-1:agent-1",
      isRecording: false,
      isProcessing: false,
      nowMs: 1250,
    });

    expect(useKeyboardShortcutsStore.getState().dictationActivity).toEqual({
      agentKey: null,
      isRecording: false,
      isProcessing: false,
      updatedAtMs: 1250,
      lastReporterAgentKey: "srv-1:agent-1",
    });
  });

  it("does not clear active state from a different agent key", () => {
    const store = useKeyboardShortcutsStore.getState();

    store.reportDictationActivity({
      agentKey: "srv-1:agent-1",
      isRecording: true,
      isProcessing: false,
      nowMs: 1000,
    });
    store.clearDictationActivity("srv-1:agent-2", 1250);

    expect(useKeyboardShortcutsStore.getState().dictationActivity).toEqual({
      agentKey: "srv-1:agent-1",
      isRecording: true,
      isProcessing: false,
      updatedAtMs: 1250,
      lastReporterAgentKey: "srv-1:agent-2",
    });
  });

  it("records inactive reports from non-active agents for replay coordination", () => {
    const store = useKeyboardShortcutsStore.getState();

    store.reportDictationActivity({
      agentKey: "srv-1:agent-2",
      isRecording: false,
      isProcessing: false,
      nowMs: 2000,
    });

    expect(useKeyboardShortcutsStore.getState().dictationActivity).toEqual({
      agentKey: null,
      isRecording: false,
      isProcessing: false,
      updatedAtMs: 2000,
      lastReporterAgentKey: "srv-1:agent-2",
    });
  });
});
