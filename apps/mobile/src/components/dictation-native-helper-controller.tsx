import { usePathname, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Platform } from "react-native";
import { getIsTauri } from "@/constants/layout";
import { useDaemonRegistry } from "@/contexts/daemon-registry-context";
import { useToast } from "@/contexts/toast-context";
import { useAppSettings } from "@/hooks/use-settings";
import type { MessageInputKeyboardActionKind } from "@/keyboard/actions";
import { resolveSelectedOrRouteAgentKey } from "@/keyboard/keyboard-shortcut-routing";
import { getHostRuntimeStore } from "@/runtime/host-runtime";
import { useKeyboardShortcutsStore } from "@/stores/keyboard-shortcuts-store";
import { generateMessageId } from "@/types/stream";
import { getLastDictationTranscript } from "@/utils/dictation-last-transcript";
import {
  clearGlobalDictationNativeHelperAutoPaste,
  requestGlobalDictationNativeHelperAutoPaste,
} from "@/utils/dictation-native-helper-autopaste";
import { rememberDictationNativeHelperAccessibilityContext } from "@/utils/dictation-native-helper-context-cache";
import {
  prepareDictationTranscriptForNativePaste,
  shouldAutoPasteDictationToFocusedApp,
} from "@/utils/dictation-paste-context";
import { parseServerIdFromPathname } from "@/utils/host-routes";
import {
  advanceNativeHelperDictationControllerState,
  createNativeHelperDictationControllerState,
  type NativeHelperDictationControllerEvent,
  type NativeHelperDictationControllerIntent,
} from "@/utils/native-helper-dictation-controller-state";
import {
  claimNativeHelperShortcutOwnership,
  isNativeHelperShortcutOwner,
  releaseNativeHelperShortcutOwnership,
} from "@/utils/native-helper-shortcut-owner";
import {
  type NativeHelperShortcutAction,
  NativeHelperShortcutStateMachine,
} from "@/utils/native-helper-shortcuts";
import { buildNewAgentRoute } from "@/utils/new-agent-routing";
import { focusMainWindow } from "@/utils/tauri-window";

const PRESSED_KEYS_RECHECK_INTERVAL_MS = 10_000;
const PENDING_STOP_REPLAY_INTERVAL_MS = 120;
const PENDING_STOP_MAX_AGE_MS = 60_000;
const QUICK_RELEASE_CANCEL_THRESHOLD_MS = 500;
const AUTOPASTE_CONTEXT_TIMEOUT_MS = 250;

type PendingDictationAction = {
  kind: "dictation-stop" | "dictation-cancel";
  requestedAt: number;
  dispatchedToInput: boolean;
  targetAgentKey: string | null;
};

function isDictationActivityActive(input: {
  isRecording: boolean;
  isProcessing: boolean;
}): boolean {
  return input.isRecording || input.isProcessing;
}

function resolveTargetServerId(input: {
  pathname: string;
  daemonServerIds: string[];
  runtime: ReturnType<typeof getHostRuntimeStore>;
}): string | null {
  const routeServerId = parseServerIdFromPathname(input.pathname);
  if (routeServerId) {
    return routeServerId;
  }

  for (const serverId of input.daemonServerIds) {
    const snapshot = input.runtime.getSnapshot(serverId);
    if (snapshot?.connectionStatus === "online" && snapshot.client) {
      return serverId;
    }
  }

  return input.daemonServerIds[0] ?? null;
}

export function DictationNativeHelperController() {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { settings } = useAppSettings();
  const { daemons } = useDaemonRegistry();
  const runtime = getHostRuntimeStore();
  const isDesktopTauriRuntime = Platform.OS === "web" && getIsTauri();

  useSyncExternalStore(
    (onStoreChange) => runtime.subscribeAll(onStoreChange),
    () => runtime.getVersion(),
    () => runtime.getVersion()
  );

  const daemonServerIds = useMemo(
    () => daemons.map((daemon) => daemon.serverId),
    [daemons]
  );
  const targetServerId = resolveTargetServerId({
    pathname,
    daemonServerIds,
    runtime,
  });
  const targetSnapshot = targetServerId
    ? runtime.getSnapshot(targetServerId)
    : null;
  const client = targetSnapshot?.client ?? null;
  const isConnected = targetSnapshot?.connectionStatus === "online";
  const selectedOrRouteAgentKey = useKeyboardShortcutsStore(
    (state) => state.selectedOrRouteAgentKey
  );
  const dictationActivity = useKeyboardShortcutsStore(
    (state) => state.dictationActivity
  );
  const isDictationActive = isDictationActivityActive(dictationActivity);

  const nativeHelperShortcutOwnerKeyRef = useRef(generateMessageId());
  const nativeHelperShortcutStateRef = useRef(
    new NativeHelperShortcutStateMachine(settings.nativeHelperShortcuts)
  );
  const nativeHelperRecheckInFlightRef = useRef(false);
  const nativeHelperDictationStateRef = useRef(
    createNativeHelperDictationControllerState()
  );
  const nativeHelperAutoPasteArmedRef = useRef(false);
  const nativeHelperAutoPasteProbeIdRef = useRef(0);
  const nativeHelperAutoPasteProbePendingRef = useRef(false);
  const nativeHelperQuickReleaseCancelTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [pendingDictationAction, setPendingDictationAction] =
    useState<PendingDictationAction | null>(null);

  const clearQuickReleaseCancelTimer = useCallback(() => {
    const timer = nativeHelperQuickReleaseCancelTimerRef.current;
    if (!timer) {
      return;
    }
    clearTimeout(timer);
    nativeHelperQuickReleaseCancelTimerRef.current = null;
  }, []);

  useEffect(() => {
    nativeHelperShortcutStateRef.current = new NativeHelperShortcutStateMachine(
      settings.nativeHelperShortcuts
    );
    nativeHelperRecheckInFlightRef.current = false;
    nativeHelperDictationStateRef.current =
      createNativeHelperDictationControllerState();
    nativeHelperAutoPasteProbeIdRef.current += 1;
    nativeHelperAutoPasteProbePendingRef.current = false;
    nativeHelperAutoPasteArmedRef.current = false;
    clearQuickReleaseCancelTimer();
    setPendingDictationAction(null);
    clearGlobalDictationNativeHelperAutoPaste();
  }, [clearQuickReleaseCancelTimer, settings.nativeHelperShortcuts]);

  const requestMessageInputAction = useCallback(
    (
      kind: MessageInputKeyboardActionKind
    ): { requested: boolean; agentKey: string | null } => {
      const agentKey =
        selectedOrRouteAgentKey ??
        resolveSelectedOrRouteAgentKey({
          pathname,
        });
      if (!agentKey) {
        return {
          requested: false,
          agentKey: null,
        };
      }
      useKeyboardShortcutsStore.getState().requestMessageInputAction({
        agentKey,
        kind,
      });
      return {
        requested: true,
        agentKey,
      };
    },
    [pathname, selectedOrRouteAgentKey]
  );

  const openNotesWindow = useCallback(
    (options?: {
      forceAutoDictate?: boolean;
      focusWindow?: boolean;
    }): boolean => {
      const target =
        parseServerIdFromPathname(pathname) ?? targetServerId ?? "";
      if (!target) {
        toast.error("No host is available to open a new note");
        return false;
      }

      const shouldFocusWindow = options?.focusWindow ?? true;
      if (isDesktopTauriRuntime && shouldFocusWindow) {
        // biome-ignore lint/complexity/noVoid: fire-and-forget async call
        void focusMainWindow();
      }

      const newNoteAt = String(Date.now());
      const shouldAutoDictate =
        options?.forceAutoDictate ?? settings.autoDictateOnNewNote;
      const autoDictateAt = shouldAutoDictate ? newNoteAt : null;

      router.push(
        buildNewAgentRoute(target, {
          newNoteAt,
          autoDictateAt,
          // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
        }) as any
      );
      return true;
    },
    [
      isDesktopTauriRuntime,
      pathname,
      router,
      settings.autoDictateOnNewNote,
      targetServerId,
      toast,
    ]
  );

  const pasteTranscriptIntoFocusedApp = useCallback(
    async (transcript: string): Promise<boolean> => {
      if (!(transcript && client && isConnected)) {
        return false;
      }

      try {
        const prepared = await prepareDictationTranscriptForNativePaste({
          transcript,
          client,
          onWarn: (message, error) => {
            console.warn(`[DictationNativeHelperController] ${message}`, error);
          },
        });

        const result = await client.pasteTextWithNativeHelper(prepared.text);
        if (!result.success) {
          toast.error("Failed to paste dictation transcript into focused app");
          return false;
        }

        return true;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to paste dictation transcript";
        toast.error(message);
        return false;
      }
    },
    [client, isConnected, toast]
  );

  const handlePasteLastTranscriptShortcut = useCallback(() => {
    const transcript = getLastDictationTranscript();
    if (!transcript) {
      return;
    }
    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void pasteTranscriptIntoFocusedApp(transcript);
  }, [pasteTranscriptIntoFocusedApp]);

  const probeNativeHelperAutoPasteFromFocusedContext = useCallback(() => {
    if (!(isDesktopTauriRuntime && client && isConnected)) {
      nativeHelperAutoPasteProbeIdRef.current += 1;
      nativeHelperAutoPasteProbePendingRef.current = false;
      nativeHelperAutoPasteArmedRef.current = false;
      return;
    }

    const probeId = nativeHelperAutoPasteProbeIdRef.current + 1;
    nativeHelperAutoPasteProbeIdRef.current = probeId;
    nativeHelperAutoPasteProbePendingRef.current = true;

    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void client
      .getNativeHelperAccessibilityContext({
        editableOnly: true,
        timeoutMs: AUTOPASTE_CONTEXT_TIMEOUT_MS,
      })
      .then((result) => {
        if (nativeHelperAutoPasteProbeIdRef.current !== probeId) {
          return;
        }
        nativeHelperAutoPasteProbePendingRef.current = false;
        rememberDictationNativeHelperAccessibilityContext(result);
        nativeHelperAutoPasteArmedRef.current =
          shouldAutoPasteDictationToFocusedApp(result);
      })
      .catch((error) => {
        if (nativeHelperAutoPasteProbeIdRef.current !== probeId) {
          return;
        }
        nativeHelperAutoPasteProbePendingRef.current = false;
        console.warn(
          "[DictationNativeHelperController] Failed to resolve focused accessibility context for external auto-paste",
          error
        );
      });
  }, [client, isConnected, isDesktopTauriRuntime]);

  const dispatchNativeHelperDictationIntent = useCallback(
    (intent: NativeHelperDictationControllerIntent, nowMs: number): boolean => {
      if (intent === "none") {
        return true;
      }

      if (intent === "start-ptt" || intent === "start-hands-free") {
        if (isDictationActive) {
          return true;
        }

        setPendingDictationAction(null);
        clearGlobalDictationNativeHelperAutoPaste();
        // Bias toward external behavior until context probe resolves.
        nativeHelperAutoPasteArmedRef.current = isDesktopTauriRuntime;
        probeNativeHelperAutoPasteFromFocusedContext();

        const startRequest = requestMessageInputAction("dictation-start");
        if (startRequest.requested) {
          return true;
        }

        nativeHelperAutoPasteProbeIdRef.current += 1;
        nativeHelperAutoPasteProbePendingRef.current = false;
        const opened = openNotesWindow({
          forceAutoDictate: true,
          focusWindow: false,
        });
        nativeHelperAutoPasteArmedRef.current = opened;
        return opened;
      }

      if (intent === "stop") {
        if (nativeHelperAutoPasteArmedRef.current) {
          requestGlobalDictationNativeHelperAutoPaste();
        } else {
          clearGlobalDictationNativeHelperAutoPaste();
        }
        const stopRequest = requestMessageInputAction("dictation-stop");
        setPendingDictationAction({
          kind: "dictation-stop",
          requestedAt: nowMs,
          dispatchedToInput: stopRequest.requested,
          targetAgentKey: stopRequest.agentKey,
        });
        nativeHelperAutoPasteProbeIdRef.current += 1;
        nativeHelperAutoPasteProbePendingRef.current = false;
        nativeHelperAutoPasteArmedRef.current = false;
        return true;
      }

      clearGlobalDictationNativeHelperAutoPaste();
      const cancelRequest = requestMessageInputAction("dictation-cancel");
      setPendingDictationAction({
        kind: "dictation-cancel",
        requestedAt: nowMs,
        dispatchedToInput: cancelRequest.requested,
        targetAgentKey: cancelRequest.agentKey,
      });
      nativeHelperAutoPasteProbeIdRef.current += 1;
      nativeHelperAutoPasteProbePendingRef.current = false;
      nativeHelperAutoPasteArmedRef.current = false;
      return true;
    },
    [
      isDesktopTauriRuntime,
      isDictationActive,
      openNotesWindow,
      probeNativeHelperAutoPasteFromFocusedContext,
      requestMessageInputAction,
    ]
  );

  const scheduleQuickReleaseCancelTimer = useCallback(() => {
    clearQuickReleaseCancelTimer();
    nativeHelperQuickReleaseCancelTimerRef.current = setTimeout(() => {
      nativeHelperQuickReleaseCancelTimerRef.current = null;

      const nowMs = Date.now();
      const latestActivity =
        useKeyboardShortcutsStore.getState().dictationActivity;
      const step = advanceNativeHelperDictationControllerState({
        state: nativeHelperDictationStateRef.current,
        event: "quick-release-timeout",
        nowMs,
        isRecordingActive: isDictationActivityActive(latestActivity),
        quickActionThresholdMs: QUICK_RELEASE_CANCEL_THRESHOLD_MS,
      });
      nativeHelperDictationStateRef.current = step.state;

      if (step.clearQuickReleaseCancelTimer) {
        clearQuickReleaseCancelTimer();
      }
      if (step.intent !== "none") {
        dispatchNativeHelperDictationIntent(step.intent, nowMs);
      }
    }, QUICK_RELEASE_CANCEL_THRESHOLD_MS);
  }, [clearQuickReleaseCancelTimer, dispatchNativeHelperDictationIntent]);

  const applyShortcutControllerEvent = useCallback(
    (event: NativeHelperDictationControllerEvent) => {
      const nowMs = Date.now();
      const step = advanceNativeHelperDictationControllerState({
        state: nativeHelperDictationStateRef.current,
        event,
        nowMs,
        isRecordingActive: isDictationActive,
        quickActionThresholdMs: QUICK_RELEASE_CANCEL_THRESHOLD_MS,
      });
      nativeHelperDictationStateRef.current = step.state;

      if (step.clearQuickReleaseCancelTimer) {
        clearQuickReleaseCancelTimer();
      }
      if (step.scheduleQuickReleaseCancelTimer) {
        scheduleQuickReleaseCancelTimer();
      }

      if (step.intent === "none") {
        return;
      }

      const handled = dispatchNativeHelperDictationIntent(step.intent, nowMs);
      if (
        !handled &&
        (step.intent === "start-ptt" || step.intent === "start-hands-free")
      ) {
        nativeHelperDictationStateRef.current =
          createNativeHelperDictationControllerState();
      }
    },
    [
      clearQuickReleaseCancelTimer,
      dispatchNativeHelperDictationIntent,
      isDictationActive,
      scheduleQuickReleaseCancelTimer,
    ]
  );

  const handleNativeHelperShortcutActions = useCallback(
    (actions: NativeHelperShortcutAction[]) => {
      for (const action of actions) {
        // biome-ignore lint/style/useDefaultSwitchClause: necessary for this context
        switch (action.type) {
          case "ptt-state-changed":
            applyShortcutControllerEvent(
              action.isPressed ? "ptt-press" : "ptt-release"
            );
            continue;

          case "toggle-recording-triggered":
            applyShortcutControllerEvent("toggle");
            continue;

          case "paste-last-transcript-triggered":
            handlePasteLastTranscriptShortcut();
            continue;

          case "open-notes-window-triggered":
            openNotesWindow({ focusWindow: true });
            continue;
        }
      }
    },
    [
      applyShortcutControllerEvent,
      handlePasteLastTranscriptShortcut,
      openNotesWindow,
    ]
  );

  useEffect(() => {
    if (isDictationActive || pendingDictationAction) {
      return;
    }

    const currentState = nativeHelperDictationStateRef.current;
    // Do not force-reset while the state machine still tracks an active flow.
    // Dictation activity updates can lag slightly behind shortcut transitions.
    if (currentState.mode !== "idle") {
      return;
    }
    if (
      currentState.recordingStartedAtMs === null &&
      !currentState.quickReleaseCancelPending
    ) {
      return;
    }

    nativeHelperDictationStateRef.current =
      createNativeHelperDictationControllerState();
    nativeHelperAutoPasteProbeIdRef.current += 1;
    nativeHelperAutoPasteProbePendingRef.current = false;
    nativeHelperAutoPasteArmedRef.current = false;
    clearQuickReleaseCancelTimer();
    clearGlobalDictationNativeHelperAutoPaste();
  }, [clearQuickReleaseCancelTimer, isDictationActive, pendingDictationAction]);

  useEffect(() => {
    if (!pendingDictationAction) {
      return;
    }

    const replayPendingActionIfNeeded = () => {
      const hasFreshInactiveUpdate =
        pendingDictationAction.dispatchedToInput &&
        pendingDictationAction.targetAgentKey !== null &&
        !isDictationActive &&
        dictationActivity.lastReporterAgentKey ===
          pendingDictationAction.targetAgentKey &&
        dictationActivity.updatedAtMs > pendingDictationAction.requestedAt;
      if (hasFreshInactiveUpdate) {
        setPendingDictationAction(null);
        return;
      }

      if (isDictationActive) {
        return;
      }

      const ageMs = Date.now() - pendingDictationAction.requestedAt;
      if (ageMs > PENDING_STOP_MAX_AGE_MS) {
        setPendingDictationAction(null);
        nativeHelperDictationStateRef.current =
          createNativeHelperDictationControllerState();
        nativeHelperAutoPasteProbeIdRef.current += 1;
        nativeHelperAutoPasteProbePendingRef.current = false;
        nativeHelperAutoPasteArmedRef.current = false;
        clearQuickReleaseCancelTimer();
        clearGlobalDictationNativeHelperAutoPaste();
        return;
      }

      const dispatchResult = requestMessageInputAction(
        pendingDictationAction.kind
      );
      if (!dispatchResult.requested) {
        return;
      }
      if (
        pendingDictationAction.dispatchedToInput &&
        pendingDictationAction.targetAgentKey === dispatchResult.agentKey
      ) {
        return;
      }

      setPendingDictationAction((current) => {
        if (
          !current ||
          current.kind !== pendingDictationAction.kind ||
          current.requestedAt !== pendingDictationAction.requestedAt
        ) {
          return current;
        }
        return {
          ...current,
          dispatchedToInput: true,
          targetAgentKey: dispatchResult.agentKey,
        };
      });
    };

    replayPendingActionIfNeeded();
    const interval = setInterval(
      replayPendingActionIfNeeded,
      PENDING_STOP_REPLAY_INTERVAL_MS
    );
    return () => {
      clearInterval(interval);
    };
  }, [
    clearQuickReleaseCancelTimer,
    dictationActivity.lastReporterAgentKey,
    dictationActivity.updatedAtMs,
    isDictationActive,
    pendingDictationAction,
    requestMessageInputAction,
  ]);

  useEffect(() => {
    if (!(isDesktopTauriRuntime && client && isConnected)) {
      return;
    }

    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void client
      .setNativeHelperShortcuts(settings.nativeHelperShortcuts)
      .catch((error) => {
        console.warn(
          "[DictationNativeHelperController] Failed to sync native helper shortcuts",
          error
        );
      });
  }, [
    client,
    isConnected,
    isDesktopTauriRuntime,
    settings.nativeHelperShortcuts,
  ]);

  useEffect(() => {
    if (!(isDesktopTauriRuntime && client && isConnected)) {
      return;
    }

    const ownerKey = nativeHelperShortcutOwnerKeyRef.current;
    const isOwner = claimNativeHelperShortcutOwnership({
      key: ownerKey,
      focused: false,
    });
    if (!isOwner) {
      return;
    }

    const unsubscribe = client.on("native_helper_event", (message) => {
      if (!isNativeHelperShortcutOwner(ownerKey)) {
        const claimed = claimNativeHelperShortcutOwnership({
          key: ownerKey,
          focused: false,
        });
        if (!claimed) {
          return;
        }
      }
      if (message.type !== "native_helper_event") {
        return;
      }
      if (message.payload.type === "error") {
        return;
      }

      const eventTimestamp =
        message.payload.payload.timestampMs != null
          ? message.payload.payload.timestampMs
          : Date.now();
      const actions =
        message.payload.type === "keyDown"
          ? nativeHelperShortcutStateRef.current.handleKeyDown(
              message.payload.payload.keyCode,
              eventTimestamp
            )
          : nativeHelperShortcutStateRef.current.handleKeyUp(
              message.payload.payload.keyCode
            );
      if (actions.length > 0) {
        handleNativeHelperShortcutActions(actions);
      }
    });

    const interval = setInterval(() => {
      if (!isNativeHelperShortcutOwner(ownerKey)) {
        const claimed = claimNativeHelperShortcutOwnership({
          key: ownerKey,
          focused: false,
        });
        if (!claimed) {
          return;
        }
      }
      const activeKeys = nativeHelperShortcutStateRef.current.getActiveKeys();
      if (activeKeys.length === 0 || nativeHelperRecheckInFlightRef.current) {
        return;
      }

      const requestStartedAt = Date.now();
      nativeHelperRecheckInFlightRef.current = true;
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void client
        .recheckNativeHelperPressedKeys(activeKeys)
        .then((result) => {
          const actions = nativeHelperShortcutStateRef.current.clearStaleKeys(
            result.staleKeyCodes ?? [],
            requestStartedAt
          );
          if (actions.length > 0) {
            handleNativeHelperShortcutActions(actions);
          }
        })
        .catch((error) => {
          console.warn(
            "[DictationNativeHelperController] Failed to recheck native helper pressed keys",
            error
          );
        })
        .finally(() => {
          nativeHelperRecheckInFlightRef.current = false;
        });
    }, PRESSED_KEYS_RECHECK_INTERVAL_MS);

    return () => {
      unsubscribe();
      clearInterval(interval);
      nativeHelperRecheckInFlightRef.current = false;
      clearQuickReleaseCancelTimer();
      nativeHelperShortcutStateRef.current.reset();
      nativeHelperDictationStateRef.current =
        createNativeHelperDictationControllerState();
      nativeHelperAutoPasteProbeIdRef.current += 1;
      nativeHelperAutoPasteProbePendingRef.current = false;
      nativeHelperAutoPasteArmedRef.current = false;
      setPendingDictationAction(null);
      clearGlobalDictationNativeHelperAutoPaste();
      releaseNativeHelperShortcutOwnership(ownerKey);
    };
  }, [
    client,
    clearQuickReleaseCancelTimer,
    handleNativeHelperShortcutActions,
    isConnected,
    isDesktopTauriRuntime,
  ]);

  return null;
}
