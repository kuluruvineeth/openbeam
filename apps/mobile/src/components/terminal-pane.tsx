import { useFocusEffect } from "@react-navigation/native";
import type { ListTerminalsResponse } from "@server/shared/messages";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Svg, {
  Defs,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
} from "react-native-svg";
import {
  StyleSheet,
  UnistylesRuntime,
  useUnistyles,
} from "react-native-unistyles";
import { useHostRuntimeSession } from "@/runtime/host-runtime";
import {
  summarizeTerminalText,
  terminalDebugLog,
} from "@/terminal/runtime/terminal-debug";
import { TerminalOutputDeliveryQueue } from "@/terminal/runtime/terminal-output-delivery-queue";
import {
  type TerminalOutputChunk,
  TerminalOutputPump,
} from "@/terminal/runtime/terminal-output-pump";
import {
  TerminalStreamController,
  type TerminalStreamControllerStatus,
} from "@/terminal/runtime/terminal-stream-controller";
import { confirmDialog } from "@/utils/confirm-dialog";
import {
  hasPendingTerminalModifiers,
  normalizeTerminalTransportKey,
  resolvePendingModifierDataInput,
} from "@/utils/terminal-keys";
import { upsertTerminalListEntry } from "@/utils/terminal-list";
import TerminalEmulator from "./terminal-emulator";

interface TerminalPaneProps {
  serverId: string;
  cwd: string;
}

const MAX_OUTPUT_CHARS = 200_000;
const TERMINAL_TAB_MAX_WIDTH = 220;
const TERMINAL_REFIT_DELAYS_MS = [0, 48, 144, 320];

const MODIFIER_LABELS = {
  ctrl: "Ctrl",
  shift: "Shift",
  alt: "Alt",
} as const;

const KEY_BUTTONS: Array<{ id: string; label: string; key: string }> = [
  { id: "esc", label: "Esc", key: "Escape" },
  { id: "tab", label: "Tab", key: "Tab" },
  { id: "up", label: "↑", key: "ArrowUp" },
  { id: "down", label: "↓", key: "ArrowDown" },
  { id: "left", label: "←", key: "ArrowLeft" },
  { id: "right", label: "→", key: "ArrowRight" },
  { id: "enter", label: "Enter", key: "Enter" },
  { id: "backspace", label: "⌫", key: "Backspace" },
  { id: "c", label: "C", key: "c" },
];

type ModifierState = {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
};

type TerminalOutputChunkState = {
  sequence: number;
  text: string;
};

type PendingTerminalInput =
  | {
      type: "data";
      data: string;
    }
  | {
      type: "key";
      input: {
        key: string;
        ctrl: boolean;
        shift: boolean;
        alt: boolean;
        meta?: boolean;
      };
    };

type ListTerminalsPayload = ListTerminalsResponse["payload"];

const EMPTY_MODIFIERS: ModifierState = {
  ctrl: false,
  shift: false,
  alt: false,
};

function terminalScopeKey(input: { serverId: string; cwd: string }): string {
  return `${input.serverId}:${input.cwd}`;
}

function TerminalCloseGradient({
  color,
  gradientId,
}: {
  color: string;
  gradientId: string;
}) {
  return (
    <View pointerEvents="none" style={styles.terminalTabCloseGradient}>
      <Svg height="100%" preserveAspectRatio="none" width="100%">
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
            <Stop offset="0%" stopColor={color} stopOpacity={0} />
            <Stop offset="10%" stopColor={color} stopOpacity={1} />
            <Stop offset="100%" stopColor={color} stopOpacity={1} />
          </SvgLinearGradient>
        </Defs>
        <Rect
          fill={`url(#${gradientId})`}
          height="100%"
          width="100%"
          x="0"
          y="0"
        />
      </Svg>
    </View>
  );
}

export function TerminalPane({ serverId, cwd }: TerminalPaneProps) {
  const { theme } = useUnistyles();
  const isMobile =
    UnistylesRuntime.breakpoint === "xs" ||
    UnistylesRuntime.breakpoint === "sm";

  const queryClient = useQueryClient();
  const { client, isConnected } = useHostRuntimeSession(serverId);

  const scopeKey = useMemo(
    () => terminalScopeKey({ serverId, cwd }),
    [serverId, cwd]
  );
  const terminalsQueryKey = useMemo(
    () => ["terminals", serverId, cwd] as const,
    [cwd, serverId]
  );
  const selectedTerminalByScopeRef = useRef<Map<string, string>>(new Map());
  const lastReportedSizeRef = useRef<{ rows: number; cols: number } | null>(
    null
  );
  const streamControllerRef = useRef<TerminalStreamController | null>(null);
  const outputPumpRef = useRef<TerminalOutputPump | null>(null);
  const outputDeliveryQueueRef = useRef<TerminalOutputDeliveryQueue | null>(
    null
  );

  const [selectedTerminalId, setSelectedTerminalId] = useState<string | null>(
    null
  );
  const [selectedOutputChunk, setSelectedOutputChunk] =
    useState<TerminalOutputChunkState>({
      sequence: 0,
      text: "",
    });
  const [selectedOutputSnapshot, setSelectedOutputSnapshot] = useState("");
  const [activeStream, setActiveStream] = useState<{
    terminalId: string;
    streamId: number;
  } | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [modifiers, setModifiers] = useState<ModifierState>(EMPTY_MODIFIERS);
  const [focusRequestToken, setFocusRequestToken] = useState(0);
  const [resizeRequestToken, setResizeRequestToken] = useState(0);
  const [hoveredTerminalId, setHoveredTerminalId] = useState<string | null>(
    null
  );
  const [hoveredCloseTerminalId, setHoveredCloseTerminalId] = useState<
    string | null
  >(null);
  const hoverOutTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedTerminalIdRef = useRef<string | null>(selectedTerminalId);
  const pendingTerminalInputRef = useRef<PendingTerminalInput[]>([]);

  useEffect(() => {
    selectedTerminalIdRef.current = selectedTerminalId;
  }, [selectedTerminalId]);

  useEffect(() => {
    const outputDeliveryQueue = new TerminalOutputDeliveryQueue({
      onDeliver: (chunk) => {
        setSelectedOutputChunk(chunk);
      },
    });
    outputDeliveryQueueRef.current = outputDeliveryQueue;

    return () => {
      if (outputDeliveryQueueRef.current === outputDeliveryQueue) {
        outputDeliveryQueueRef.current = null;
      }
      outputDeliveryQueue.reset();
    };
  }, []);

  useEffect(() => {
    const outputPump = new TerminalOutputPump({
      maxOutputChars: MAX_OUTPUT_CHARS,
      onSelectedOutputChunk: (chunk: TerminalOutputChunk) => {
        outputDeliveryQueueRef.current?.enqueue(chunk);
      },
    });
    outputPumpRef.current = outputPump;

    return () => {
      if (outputPumpRef.current === outputPump) {
        outputPumpRef.current = null;
      }
      outputPump.dispose();
    };
  }, []);

  const clearHoverOutTimeout = useCallback(() => {
    if (!hoverOutTimeoutRef.current) {
      return;
    }
    clearTimeout(hoverOutTimeoutRef.current);
    hoverOutTimeoutRef.current = null;
  }, []);

  const handleTerminalTabHoverIn = useCallback(
    (terminalId: string) => {
      clearHoverOutTimeout();
      setHoveredTerminalId(terminalId);
    },
    [clearHoverOutTimeout]
  );

  const handleTerminalTabHoverOut = useCallback(
    (terminalId: string) => {
      clearHoverOutTimeout();
      hoverOutTimeoutRef.current = setTimeout(() => {
        setHoveredTerminalId((current) =>
          current === terminalId ? null : current
        );
        setHoveredCloseTerminalId((current) =>
          current === terminalId ? null : current
        );
      }, 50);
    },
    [clearHoverOutTimeout]
  );

  const handleTerminalCloseHoverIn = useCallback(
    (terminalId: string) => {
      clearHoverOutTimeout();
      setHoveredTerminalId(terminalId);
      setHoveredCloseTerminalId(terminalId);
    },
    [clearHoverOutTimeout]
  );

  const handleTerminalCloseHoverOut = useCallback((terminalId: string) => {
    setHoveredCloseTerminalId((current) =>
      current === terminalId ? null : current
    );
  }, []);

  useEffect(() => () => clearHoverOutTimeout(), [clearHoverOutTimeout]);

  const requestTerminalFocus = useCallback(() => {
    setFocusRequestToken((current) => current + 1);
  }, []);
  const requestTerminalReflow = useCallback(() => {
    setResizeRequestToken((current) => current + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!selectedTerminalId) {
        return;
      }
      // Navigation transitions can temporarily report stale dimensions.
      // Pulse forced refits so xterm fills the pane when returning to an agent.
      const timeoutHandles = TERMINAL_REFIT_DELAYS_MS.map((delayMs) =>
        setTimeout(() => {
          requestTerminalReflow();
        }, delayMs)
      );

      return () => {
        for (const handle of timeoutHandles) {
          clearTimeout(handle);
        }
      };
    }, [requestTerminalReflow, selectedTerminalId])
  );

  const terminalsQuery = useQuery({
    queryKey: terminalsQueryKey,
    enabled: Boolean(client && isConnected && cwd.startsWith("/")),
    queryFn: async () => {
      if (!client) {
        throw new Error("Host is not connected");
      }
      return await client.listTerminals(cwd);
    },
    staleTime: 5000,
  });

  const terminals = terminalsQuery.data?.terminals ?? [];

  useEffect(() => {
    if (!(client && isConnected)) {
      return;
    }

    return client.on("terminal_stream_exit", (message) => {
      if (message.type !== "terminal_stream_exit") {
        return;
      }

      const exitedTerminalId = message.payload.terminalId;
      if (!exitedTerminalId) {
        return;
      }

      streamControllerRef.current?.handleStreamExit({
        terminalId: exitedTerminalId,
        streamId: message.payload.streamId,
      });
      setModifiers({ ...EMPTY_MODIFIERS });

      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void queryClient.invalidateQueries({
        queryKey: terminalsQueryKey,
      });
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void queryClient.refetchQueries({
        queryKey: terminalsQueryKey,
        type: "active",
      });
    });
  }, [client, isConnected, queryClient, terminalsQueryKey]);

  useEffect(() => {
    if (!(client && isConnected && cwd.startsWith("/"))) {
      return;
    }

    const unsubscribe = client.on("terminals_changed", (message) => {
      if (message.type !== "terminals_changed") {
        return;
      }
      if (message.payload.cwd !== cwd) {
        return;
      }
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void queryClient.invalidateQueries({
        queryKey: terminalsQueryKey,
      });
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void queryClient.refetchQueries({
        queryKey: terminalsQueryKey,
        type: "active",
      });
    });

    client.subscribeTerminals({ cwd });

    return () => {
      unsubscribe();
      client.unsubscribeTerminals({ cwd });
    };
  }, [client, cwd, isConnected, queryClient, terminalsQueryKey]);

  const createTerminalMutation = useMutation({
    mutationFn: async () => {
      if (!client) {
        throw new Error("Host is not connected");
      }
      return await client.createTerminal(cwd);
    },
    onSuccess: (payload) => {
      const createdTerminal = payload.terminal;
      if (createdTerminal) {
        queryClient.setQueryData<ListTerminalsPayload>(
          terminalsQueryKey,
          (current) => {
            const nextTerminals = upsertTerminalListEntry({
              terminals: current?.terminals ?? [],
              terminal: createdTerminal,
            });

            return {
              cwd: current?.cwd ?? cwd,
              terminals: nextTerminals,
              requestId:
                current?.requestId ?? `terminal-create-${createdTerminal.id}`,
            };
          }
        );
        selectedTerminalByScopeRef.current.set(scopeKey, createdTerminal.id);
        setSelectedTerminalId(createdTerminal.id);
        requestTerminalFocus();
      }
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void queryClient.invalidateQueries({
        queryKey: terminalsQueryKey,
      });
    },
  });

  const killTerminalMutation = useMutation({
    mutationFn: async (terminalId: string) => {
      if (!client) {
        throw new Error("Host is not connected");
      }
      const payload = await client.killTerminal(terminalId);
      if (!payload.success) {
        throw new Error("Unable to close terminal");
      }
      return payload;
    },
    onSuccess: (_, terminalId) => {
      setHoveredTerminalId((current) =>
        current === terminalId ? null : current
      );
      outputPumpRef.current?.clearTerminal({ terminalId });
      if (selectedTerminalIdRef.current === terminalId) {
        setSelectedTerminalId((current) =>
          current === terminalId ? null : current
        );
        setModifiers({ ...EMPTY_MODIFIERS });
      }
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void queryClient.invalidateQueries({
        queryKey: terminalsQueryKey,
      });
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void queryClient.refetchQueries({
        queryKey: terminalsQueryKey,
        type: "active",
      });
    },
  });

  useEffect(() => {
    setSelectedTerminalId(
      selectedTerminalByScopeRef.current.get(scopeKey) ?? null
    );
    lastReportedSizeRef.current = null;
  }, [scopeKey]);

  useEffect(() => {
    if (selectedTerminalId) {
      selectedTerminalByScopeRef.current.set(scopeKey, selectedTerminalId);
    }
  }, [scopeKey, selectedTerminalId]);

  useEffect(() => {
    if (terminals.length === 0) {
      setSelectedTerminalId(null);
      return;
    }

    const has = (id: string | null | undefined) =>
      Boolean(id && terminals.some((terminal) => terminal.id === id));

    if (has(selectedTerminalId)) {
      return;
    }

    const stored = selectedTerminalByScopeRef.current.get(scopeKey);
    if (has(stored)) {
      // biome-ignore lint/style/noNonNullAssertion: ref guaranteed to be set
      setSelectedTerminalId(stored!);
      return;
    }

    const fallback = terminals[0]?.id ?? null;
    if (fallback) {
      selectedTerminalByScopeRef.current.set(scopeKey, fallback);
      setSelectedTerminalId(fallback);
    }
  }, [scopeKey, terminals, selectedTerminalId]);

  useEffect(() => {
    const terminalIds = terminals.map((terminal) => terminal.id);
    outputPumpRef.current?.prune({ terminalIds });
    streamControllerRef.current?.pruneResumeOffsets({ terminalIds });
  }, [terminals]);

  const handleStreamControllerStatus = useCallback(
    (status: TerminalStreamControllerStatus) => {
      setIsAttaching(status.isAttaching);
      setStreamError(status.error);
      if (status.terminalId && typeof status.streamId === "number") {
        setActiveStream({
          terminalId: status.terminalId,
          streamId: status.streamId,
        });
        return;
      }
      setActiveStream(null);
    },
    []
  );

  useEffect(() => {
    streamControllerRef.current?.dispose();
    streamControllerRef.current = null;
    setActiveStream(null);
    setIsAttaching(false);
    setStreamError(null);

    if (!(client && isConnected)) {
      return;
    }

    const outputPump = outputPumpRef.current;
    if (!outputPump) {
      return;
    }

    const controller = new TerminalStreamController({
      client,
      getPreferredSize: () => lastReportedSizeRef.current,
      onChunk: ({ terminalId, text }) => {
        outputPump.append({ terminalId, text });
      },
      onReset: ({ terminalId }) => {
        outputPump.clearTerminal({ terminalId });
        if (selectedTerminalIdRef.current === terminalId) {
          setSelectedOutputSnapshot("");
        }
      },
      onStatusChange: handleStreamControllerStatus,
    });

    streamControllerRef.current = controller;
    controller.setTerminal({ terminalId: selectedTerminalIdRef.current });

    return () => {
      controller.dispose();
      if (streamControllerRef.current === controller) {
        streamControllerRef.current = null;
      }
    };
  }, [client, handleStreamControllerStatus, isConnected]);

  useEffect(() => {
    outputDeliveryQueueRef.current?.reset();
    pendingTerminalInputRef.current = [];
    setSelectedOutputChunk({ sequence: 0, text: "" });
    outputPumpRef.current?.setSelectedTerminal({
      terminalId: selectedTerminalId,
    });
    streamControllerRef.current?.setTerminal({
      terminalId: selectedTerminalId,
    });
    setSelectedOutputSnapshot(
      outputPumpRef.current?.readSnapshot({
        terminalId: selectedTerminalId,
      }) ?? ""
    );
  }, [selectedTerminalId]);

  const _activeStreamId =
    activeStream && activeStream.terminalId === selectedTerminalId
      ? activeStream.streamId
      : null;
  const getCurrentActiveStreamId = useCallback(
    () => streamControllerRef.current?.getActiveStreamId() ?? null,
    []
  );

  const selectedTerminal = useMemo(
    () =>
      terminals.find((terminal) => terminal.id === selectedTerminalId) ?? null,
    [terminals, selectedTerminalId]
  );
  const handleCreateTerminal = useCallback(() => {
    createTerminalMutation.mutate();
  }, [createTerminalMutation]);

  const enqueuePendingTerminalInput = useCallback(
    (entry: PendingTerminalInput) => {
      const queue = pendingTerminalInputRef.current;
      queue.push(entry);
      if (queue.length > 512) {
        queue.splice(0, queue.length - 512);
      }
    },
    []
  );

  const flushPendingTerminalInput = useCallback(() => {
    if (!client) {
      return;
    }
    const currentStreamId = getCurrentActiveStreamId();
    if (currentStreamId === null) {
      return;
    }
    const queue = pendingTerminalInputRef.current;
    if (queue.length === 0) {
      return;
    }

    const pending = queue.splice(0, queue.length);

    for (const entry of pending) {
      if (entry.type === "data") {
        client.sendTerminalStreamInput(currentStreamId, entry.data);
        continue;
      }
      client.sendTerminalStreamKey(currentStreamId, entry.input);
    }
  }, [client, getCurrentActiveStreamId]);

  useEffect(() => {
    flushPendingTerminalInput();
  }, [flushPendingTerminalInput]);

  const handleCloseTerminal = useCallback(
    async (terminalId: string) => {
      if (
        killTerminalMutation.isPending &&
        killTerminalMutation.variables === terminalId
      ) {
        return;
      }

      const confirmed = await confirmDialog({
        title: "Close terminal?",
        message:
          "Any running process in this terminal will be stopped immediately.",
        confirmLabel: "Close",
        cancelLabel: "Cancel",
        destructive: true,
      });

      if (!confirmed) {
        return;
      }

      killTerminalMutation.mutate(terminalId);
    },
    [killTerminalMutation]
  );

  const clearPendingModifiers = useCallback(() => {
    setModifiers({ ...EMPTY_MODIFIERS });
  }, []);

  const sendTerminalKey = useCallback(
    (input: {
      key: string;
      ctrl: boolean;
      shift: boolean;
      alt: boolean;
      meta?: boolean;
    }): boolean => {
      const currentStreamId = getCurrentActiveStreamId();
      if (!client || currentStreamId === null) {
        enqueuePendingTerminalInput({
          type: "key",
          input: {
            key: normalizeTerminalTransportKey(input.key),
            ctrl: input.ctrl,
            shift: input.shift,
            alt: input.alt,
            meta: input.meta,
          },
        });
        return true;
      }

      const normalizedKey = normalizeTerminalTransportKey(input.key);
      terminalDebugLog({
        scope: "terminal-pane",
        event: "input:key:send",
        details: {
          key: normalizedKey,
          ctrl: input.ctrl,
          shift: input.shift,
          alt: input.alt,
          activeStreamId: currentStreamId,
        },
      });
      client.sendTerminalStreamKey(currentStreamId, {
        key: normalizedKey,
        ctrl: input.ctrl,
        shift: input.shift,
        alt: input.alt,
        meta: input.meta,
      });
      return true;
    },
    [client, enqueuePendingTerminalInput, getCurrentActiveStreamId]
  );

  const handleTerminalData = useCallback(
    // biome-ignore lint/suspicious/useAwait: async signature required by interface
    async (data: string) => {
      if (data.length === 0) {
        return;
      }
      const currentStreamId = getCurrentActiveStreamId();
      terminalDebugLog({
        scope: "terminal-pane",
        event: "input:data:received",
        details: {
          length: data.length,
          preview: summarizeTerminalText({ text: data, maxChars: 80 }),
          activeStreamId: currentStreamId,
        },
      });

      if (hasPendingTerminalModifiers(modifiers)) {
        const pendingResolution = resolvePendingModifierDataInput({
          data,
          pendingModifiers: modifiers,
        });
        if (
          pendingResolution.mode === "key" &&
          sendTerminalKey({
            key: pendingResolution.key,
            ctrl: modifiers.ctrl,
            shift: modifiers.shift,
            alt: modifiers.alt,
            meta: false,
          })
        ) {
          clearPendingModifiers();
          return;
        }

        if (pendingResolution.clearPendingModifiers) {
          clearPendingModifiers();
        }
      }

      if (!client || currentStreamId === null) {
        enqueuePendingTerminalInput({
          type: "data",
          data,
        });
        return;
      }
      terminalDebugLog({
        scope: "terminal-pane",
        event: "input:data:send",
        details: {
          length: data.length,
          preview: summarizeTerminalText({ text: data, maxChars: 80 }),
          activeStreamId: currentStreamId,
        },
      });
      client.sendTerminalStreamInput(currentStreamId, data);
    },
    [
      clearPendingModifiers,
      client,
      getCurrentActiveStreamId,
      modifiers.alt,
      modifiers.ctrl,
      modifiers.shift,
      sendTerminalKey,
      enqueuePendingTerminalInput,
      modifiers,
    ]
  );

  const handleTerminalResize = useCallback(
    // biome-ignore lint/suspicious/useAwait: async signature required by interface
    async (input: { rows: number; cols: number }) => {
      const { rows, cols } = input;
      if (!(client && selectedTerminalId) || rows <= 0 || cols <= 0) {
        return;
      }
      const normalizedRows = Math.floor(rows);
      const normalizedCols = Math.floor(cols);
      const previous = lastReportedSizeRef.current;
      if (
        previous &&
        previous.rows === normalizedRows &&
        previous.cols === normalizedCols
      ) {
        return;
      }
      lastReportedSizeRef.current = {
        rows: normalizedRows,
        cols: normalizedCols,
      };
      terminalDebugLog({
        scope: "terminal-pane",
        event: "display:resize:send",
        details: {
          terminalId: selectedTerminalId,
          rows: normalizedRows,
          cols: normalizedCols,
        },
      });
      client.sendTerminalInput(selectedTerminalId, {
        type: "resize",
        rows: normalizedRows,
        cols: normalizedCols,
      });
    },
    [client, selectedTerminalId]
  );

  const handleTerminalKey = useCallback(
    // biome-ignore lint/suspicious/useAwait: async signature required by interface
    async (input: {
      key: string;
      ctrl: boolean;
      shift: boolean;
      alt: boolean;
      meta: boolean;
    }) => {
      sendTerminalKey(input);
    },
    [sendTerminalKey]
  );

  const handlePendingModifiersConsumed = useCallback(() => {
    clearPendingModifiers();
  }, [clearPendingModifiers]);

  const handleOutputChunkConsumed = useCallback((sequence: number) => {
    outputDeliveryQueueRef.current?.consume({ sequence });
  }, []);

  const toggleModifier = useCallback(
    (modifier: keyof ModifierState) => {
      setModifiers((current) => ({
        ...current,
        [modifier]: !current[modifier],
      }));
      requestTerminalFocus();
    },
    [requestTerminalFocus]
  );

  const sendVirtualKey = useCallback(
    (key: string) => {
      sendTerminalKey({
        key,
        ctrl: modifiers.ctrl,
        shift: modifiers.shift,
        alt: modifiers.alt,
        meta: false,
      });
      clearPendingModifiers();
      requestTerminalFocus();
    },
    [
      clearPendingModifiers,
      modifiers.alt,
      modifiers.ctrl,
      modifiers.shift,
      requestTerminalFocus,
      sendTerminalKey,
    ]
  );

  if (!(client && isConnected)) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.stateText}>Host is not connected</Text>
      </View>
    );
  }

  const queryError =
    terminalsQuery.error instanceof Error ? terminalsQuery.error.message : null;
  const isCreating = createTerminalMutation.isPending;
  const createError =
    createTerminalMutation.error instanceof Error
      ? createTerminalMutation.error.message
      : null;
  const closeError =
    killTerminalMutation.error instanceof Error
      ? killTerminalMutation.error.message
      : null;
  const combinedError = streamError ?? closeError ?? createError ?? queryError;

  return (
    <View style={styles.container}>
      <View style={styles.header} testID="terminals-header">
        <ScrollView
          contentContainerStyle={styles.tabsContent}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
        >
          {terminals.map((terminal) => {
            const isActive = terminal.id === selectedTerminalId;
            const isTabHovered = hoveredTerminalId === terminal.id;
            const isCloseHovered = hoveredCloseTerminalId === terminal.id;
            const isClosingTerminal =
              killTerminalMutation.isPending &&
              killTerminalMutation.variables === terminal.id;
            const shouldShowCloseButton =
              isTabHovered || isCloseHovered || isClosingTerminal;
            const gradientId = `terminal-close-gradient-${terminal.id.replace(
              /[^a-zA-Z0-9_-]/g,
              "-"
            )}`;
            return (
              <Pressable
                key={terminal.id}
                onHoverIn={() => handleTerminalTabHoverIn(terminal.id)}
                onHoverOut={() => handleTerminalTabHoverOut(terminal.id)}
                onPress={() => setSelectedTerminalId(terminal.id)}
                style={({ pressed, hovered }) => [
                  styles.terminalTab,
                  isActive && styles.terminalTabActive,
                  shouldShowCloseButton && styles.terminalTabHovered,
                  (pressed || hovered) && styles.terminalTabHovered,
                ]}
                testID={`terminal-tab-${terminal.id}`}
              >
                <Text
                  ellipsizeMode="tail"
                  numberOfLines={1}
                  style={[
                    styles.terminalTabText,
                    isActive && styles.terminalTabTextActive,
                  ]}
                >
                  {terminal.name}
                </Text>
                <Pressable
                  disabled={!shouldShowCloseButton || isClosingTerminal}
                  onHoverIn={() => handleTerminalCloseHoverIn(terminal.id)}
                  onHoverOut={() => handleTerminalCloseHoverOut(terminal.id)}
                  onPress={(event) => {
                    event.stopPropagation();
                    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                    void handleCloseTerminal(terminal.id);
                  }}
                  pointerEvents={shouldShowCloseButton ? "auto" : "none"}
                  // biome-ignore lint/correctness/noUnusedFunctionParameters: required by callback signature
                  style={({ hovered, pressed }) => [
                    styles.terminalTabCloseButton,
                    shouldShowCloseButton
                      ? styles.terminalTabCloseButtonShown
                      : styles.terminalTabCloseButtonHidden,
                  ]}
                  testID={`terminal-close-${terminal.id}`}
                >
                  {({ hovered = false, pressed = false }) => {
                    const iconColor =
                      hovered || pressed
                        ? theme.colors.foreground
                        : theme.colors.foregroundMuted;
                    return (
                      <>
                        <TerminalCloseGradient
                          color={theme.colors.surface2}
                          gradientId={gradientId}
                        />
                        <View style={styles.terminalTabCloseIcon}>
                          {isClosingTerminal ? (
                            <ActivityIndicator color={iconColor} size={12} />
                          ) : (
                            <X color={iconColor} size={12} />
                          )}
                        </View>
                      </>
                    );
                  }}
                </Pressable>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.headerActions}>
          <Pressable
            disabled={isCreating}
            onPress={handleCreateTerminal}
            style={({ hovered, pressed }) => [
              styles.headerIconButton,
              (hovered || pressed) && styles.headerIconButtonHovered,
            ]}
            testID="terminals-create-button"
          >
            {isCreating ? (
              <ActivityIndicator
                color={theme.colors.foregroundMuted}
                size="small"
              />
            ) : (
              <Plus color={theme.colors.foregroundMuted} size={16} />
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.outputContainer}>
        {selectedTerminal ? (
          <View style={styles.terminalGestureContainer}>
            <TerminalEmulator
              backgroundColor={theme.colors.background}
              cursorColor={theme.colors.foreground}
              dom={{
                style: { flex: 1 },
                matchContents: false,
                scrollEnabled: true,
                nestedScrollEnabled: true,
                overScrollMode: "never",
                bounces: false,
                automaticallyAdjustContentInsets: false,
                contentInsetAdjustmentBehavior: "never",
              }}
              focusRequestToken={focusRequestToken}
              foregroundColor={theme.colors.foreground}
              initialOutputText={selectedOutputSnapshot}
              onInput={handleTerminalData}
              onOutputChunkConsumed={handleOutputChunkConsumed}
              onPendingModifiersConsumed={handlePendingModifiersConsumed}
              onResize={handleTerminalResize}
              onTerminalKey={handleTerminalKey}
              outputChunkSequence={selectedOutputChunk.sequence}
              outputChunkText={selectedOutputChunk.text}
              pendingModifiers={modifiers}
              resizeRequestToken={resizeRequestToken}
              streamKey={`${scopeKey}:${selectedTerminal.id}`}
              testId="terminal-surface"
            />
          </View>
        ) : (
          <View style={styles.centerState}>
            <Text style={styles.stateText}>No terminal selected</Text>
          </View>
        )}

        {isAttaching ? (
          <View
            pointerEvents="none"
            style={styles.attachOverlay}
            testID="terminal-attach-loading"
          >
            <ActivityIndicator
              color={theme.colors.foregroundMuted}
              size="small"
            />
          </View>
        ) : null}
      </View>

      {combinedError ? (
        <View style={styles.errorRow}>
          <Text numberOfLines={2} style={styles.statusError}>
            {combinedError}
          </Text>
        </View>
      ) : null}

      {isMobile ? (
        <View
          style={styles.keyboardContainer}
          testID="terminal-virtual-keyboard"
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.keyboardRow}>
              {(Object.keys(MODIFIER_LABELS) as Array<keyof ModifierState>).map(
                (modifier) => (
                  <Pressable
                    key={modifier}
                    onPress={() => toggleModifier(modifier)}
                    style={({ hovered, pressed }) => [
                      styles.keyButton,
                      modifiers[modifier] && styles.keyButtonActive,
                      (hovered || pressed) && styles.keyButtonHovered,
                    ]}
                    testID={`terminal-key-${modifier}`}
                  >
                    <Text
                      style={[
                        styles.keyButtonText,
                        modifiers[modifier] && styles.keyButtonTextActive,
                      ]}
                    >
                      {MODIFIER_LABELS[modifier]}
                    </Text>
                  </Pressable>
                )
              )}

              {KEY_BUTTONS.map((button) => (
                <Pressable
                  key={button.id}
                  onPress={() => sendVirtualKey(button.key)}
                  style={({ hovered, pressed }) => [
                    styles.keyButton,
                    (hovered || pressed) && styles.keyButtonHovered,
                  ]}
                  testID={`terminal-key-${button.id}`}
                >
                  <Text style={styles.keyButtonText}>{button.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.colors.surface0,
  },
  header: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[1],
    paddingVertical: theme.spacing[1],
  },
  tabsScroll: {
    flex: 1,
    minWidth: 0,
  },
  tabsContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    paddingRight: theme.spacing[2],
  },
  terminalTab: {
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    justifyContent: "center",
    maxWidth: TERMINAL_TAB_MAX_WIDTH,
    minWidth: 96,
    overflow: "hidden",
    position: "relative",
  },
  terminalTabHovered: {
    backgroundColor: theme.colors.surface2,
  },
  terminalTabActive: {
    backgroundColor: theme.colors.surface2,
  },
  terminalTabText: {
    minWidth: 0,
    flexShrink: 1,
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.normal,
  },
  terminalTabTextActive: {
    color: theme.colors.foreground,
  },
  terminalTabCloseButton: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 32,
    borderRadius: theme.borderRadius.sm,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: theme.spacing[2],
  },
  terminalTabCloseButtonShown: {
    opacity: 1,
  },
  terminalTabCloseButtonHidden: {
    opacity: 0,
  },
  terminalTabCloseGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.borderRadius.sm,
    overflow: "hidden",
    zIndex: 0,
  },
  terminalTabCloseIcon: {
    position: "relative",
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  headerIconButton: {
    width: 30,
    height: 30,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconButtonHovered: {
    backgroundColor: theme.colors.surface2,
  },
  outputContainer: {
    flex: 1,
    minHeight: 0,
    position: "relative",
    backgroundColor: theme.colors.background,
  },
  terminalGestureContainer: {
    flex: 1,
    minHeight: 0,
  },
  attachOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.16)",
  },
  errorRow: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface1,
  },
  statusError: {
    color: theme.colors.destructive,
    fontSize: theme.fontSize.xs,
  },
  keyboardContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface0,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[2],
  },
  keyboardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    paddingRight: theme.spacing[3],
  },
  keyButton: {
    minWidth: 44,
    height: 34,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[2],
    backgroundColor: theme.colors.surface1,
  },
  keyButtonHovered: {
    backgroundColor: theme.colors.surface2,
  },
  keyButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface2,
  },
  keyButtonText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  keyButtonTextActive: {
    color: theme.colors.foreground,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[4],
  },
  stateText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    textAlign: "center",
  },
}));
