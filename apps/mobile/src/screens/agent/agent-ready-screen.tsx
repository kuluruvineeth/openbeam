import { useFocusEffect } from "@react-navigation/native";
import type { DaemonClient } from "@server/client/daemon-client";
import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import {
  CheckCircle2,
  Folder,
  GitBranch,
  MoreVertical,
  PanelRight,
  RotateCcw,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import ReanimatedAnimated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  StyleSheet,
  UnistylesRuntime,
  useUnistyles,
} from "react-native-unistyles";
import { AgentInputArea } from "@/components/agent-input-area";
import { AgentStreamView } from "@/components/agent-stream-view";
import { ExplorerSidebar } from "@/components/explorer-sidebar";
import { FileDropZone } from "@/components/file-drop-zone";
import { BackHeader } from "@/components/headers/back-header";
import { HeaderToggleButton } from "@/components/headers/header-toggle-button";
import { MenuHeader } from "@/components/headers/menu-header";
import type { ImageAttachment } from "@/components/message-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDaemonConnections } from "@/contexts/daemon-connections-context";
import { ExplorerSidebarAnimationProvider } from "@/contexts/explorer-sidebar-animation-context";
import type { Agent } from "@/contexts/session-context";
import { useToast } from "@/contexts/toast-context";
import { useAgentInitialization } from "@/hooks/use-agent-initialization";
import {
  type AgentScreenMissingState,
  useAgentScreenStateMachine,
} from "@/hooks/use-agent-screen-state-machine";
import { useArchiveAgent } from "@/hooks/use-archive-agent";
import {
  type CheckoutStatusPayload,
  checkoutStatusQueryKey,
  useCheckoutStatusQuery,
} from "@/hooks/use-checkout-status-query";
import { useExplorerOpenGesture } from "@/hooks/use-explorer-open-gesture";
import {
  type HostRuntimeConnectionStatus,
  useHostRuntimeSession,
} from "@/runtime/host-runtime";
import { useCreateFlowStore } from "@/stores/create-flow-store";
import type { ExplorerCheckoutContext } from "@/stores/panel-store";
import { usePanelStore } from "@/stores/panel-store";
import { useSessionStore } from "@/stores/session-store";
import type { StreamItem } from "@/types/stream";
import { shouldClearAgentAttentionOnView } from "@/utils/agent-attention";
import { deriveProjectPath } from "@/utils/agent-display-info";
import { getInitDeferred, getInitKey } from "@/utils/agent-initialization";
import {
  derivePendingPermissionKey,
  normalizeAgentSnapshot,
} from "@/utils/agent-snapshots";
import { extractAgentModel } from "@/utils/extract-agent-model";
import { buildHostAgentDraftRoute } from "@/utils/host-routes";
import {
  buildAgentNavigationKey,
  endNavigationTiming,
  HOME_NAVIGATION_KEY,
  startNavigationTiming,
} from "@/utils/navigation-timing";
import { mergePendingCreateImages } from "@/utils/pending-create-images";
import { startPerfMonitor } from "@/utils/perf-monitor";
import { resolveProjectPlacement } from "@/utils/project-placement";
import { shortenPath } from "@/utils/shorten-path";

const DROPDOWN_WIDTH = 220;
const EMPTY_STREAM_ITEMS: StreamItem[] = [];
const IS_DEV = Boolean((globalThis as { __DEV__?: boolean }).__DEV__);

function logAgentExplorer(
  event: string,
  details: Record<string, unknown>
): void {
  if (!IS_DEV) {
    return;
  }
  console.log(`[AgentExplorer] ${event}`, details);
}

export function AgentReadyScreen({
  serverId,
  agentId,
}: {
  serverId: string;
  agentId: string;
}) {
  const router = useRouter();
  const resolvedAgentId = agentId?.trim() || undefined;
  const resolvedServerId = serverId?.trim() || undefined;
  const { connectionStates } = useDaemonConnections();
  const runtimeServerId = resolvedServerId ?? "";
  const {
    snapshot: runtimeSnapshot,
    client: runtimeClient,
    isConnected: runtimeIsConnected,
  } = useHostRuntimeSession(runtimeServerId);

  const connectionServerId = resolvedServerId ?? null;
  const connection = connectionServerId
    ? connectionStates.get(connectionServerId)
    : null;
  const serverLabel =
    connection?.daemon.label ?? connectionServerId ?? "Selected host";
  const isUnknownDaemon = Boolean(connectionServerId && !connection);
  const connectionStatus: HostRuntimeConnectionStatus =
    runtimeSnapshot?.connectionStatus ??
    (isUnknownDaemon ? "offline" : "connecting");
  const lastConnectionError = runtimeSnapshot?.lastError ?? null;
  const isRuntimeSessionAvailable = Boolean(resolvedServerId && runtimeClient);

  const handleBackToHome = useCallback(() => {
    const targetServerId = resolvedServerId;
    const targetAgentId = resolvedAgentId ?? null;
    if (targetServerId && targetAgentId) {
      startNavigationTiming(HOME_NAVIGATION_KEY, {
        from: "agent",
        to: "home",
        targetMs: 300,
        params: {
          serverId: targetServerId,
          agentId: targetAgentId,
        },
      });
    } else {
      startNavigationTiming(HOME_NAVIGATION_KEY, {
        from: "agent",
        to: "home",
        targetMs: 300,
      });
    }
    if (targetServerId) {
      // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
      router.replace(buildHostAgentDraftRoute(targetServerId) as any);
      return;
    }
    // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
    router.replace("/" as any);
  }, [resolvedAgentId, resolvedServerId, router]);

  const focusServerId = resolvedServerId;
  const navigationStatus = isRuntimeSessionAvailable
    ? "ready"
    : "session_unavailable";

  useFocusEffect(
    useCallback(() => {
      if (!(resolvedAgentId && focusServerId)) {
        return;
      }
      const navigationKey = buildAgentNavigationKey(
        focusServerId,
        resolvedAgentId
      );
      endNavigationTiming(navigationKey, {
        screen: "agent",
        status: navigationStatus,
      });
    }, [focusServerId, navigationStatus, resolvedAgentId])
  );

  if (!(resolvedServerId && runtimeClient)) {
    return (
      <AgentSessionUnavailableState
        connectionStatus={connectionStatus}
        isUnknownDaemon={isUnknownDaemon}
        lastError={lastConnectionError}
        onBack={handleBackToHome}
        serverLabel={serverLabel}
      />
    );
  }

  return (
    <ExplorerSidebarAnimationProvider>
      <AgentScreenContent
        agentId={resolvedAgentId}
        client={runtimeClient}
        connectionStatus={connectionStatus}
        isConnected={runtimeIsConnected}
        serverId={resolvedServerId}
      />
    </ExplorerSidebarAnimationProvider>
  );
}

type AgentScreenContentProps = {
  serverId: string;
  agentId?: string;
  client: DaemonClient;
  isConnected: boolean;
  connectionStatus: HostRuntimeConnectionStatus;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function isNotFoundErrorMessage(message: string): boolean {
  // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
  return /agent not found|not found/i.test(message);
}

function AgentScreenContent({
  serverId,
  agentId,
  client,
  isConnected,
  connectionStatus,
}: AgentScreenContentProps) {
  const { theme } = useUnistyles();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const resolvedAgentId = agentId;
  const { isArchivingAgent } = useArchiveAgent();

  const addImagesRef = useRef<((images: ImageAttachment[]) => void) | null>(
    null
  );

  const handleFilesDropped = useCallback((files: ImageAttachment[]) => {
    addImagesRef.current?.(files);
  }, []);

  const handleAddImagesCallback = useCallback(
    (addImages: (images: ImageAttachment[]) => void) => {
      addImagesRef.current = addImages;
    },
    []
  );

  const isMobile =
    UnistylesRuntime.breakpoint === "xs" ||
    UnistylesRuntime.breakpoint === "sm";

  const mobileView = usePanelStore((state) => state.mobileView);
  const desktopFileExplorerOpen = usePanelStore(
    (state) => state.desktop.fileExplorerOpen
  );
  const toggleFileExplorer = usePanelStore((state) => state.toggleFileExplorer);
  const openFileExplorer = usePanelStore((state) => state.openFileExplorer);
  const closeToAgent = usePanelStore((state) => state.closeToAgent);
  const setActiveExplorerCheckout = usePanelStore(
    (state) => state.setActiveExplorerCheckout
  );
  const activateExplorerTabForCheckout = usePanelStore(
    (state) => state.activateExplorerTabForCheckout
  );

  // Derive isExplorerOpen from the unified panel state
  const isExplorerOpen = isMobile
    ? mobileView === "file-explorer"
    : desktopFileExplorerOpen;
  // Select only the specific agent
  const agent = useSessionStore((state) =>
    resolvedAgentId
      ? state.sessions[serverId]?.agents?.get(resolvedAgentId)
      : undefined
  );
  // Checkout status for header subtitle + git fallback when cached project placement is absent
  const checkoutStatusQuery = useCheckoutStatusQuery({
    serverId,
    cwd: agent?.cwd ?? "",
  });
  const checkout = checkoutStatusQuery.status;
  const resolveCachedCheckoutIsGit = useCallback(
    (params: {
      cwd?: string | null;
      projectPlacementIsGit?: boolean;
      checkoutStatusIsGit?: boolean;
    }): boolean | null => {
      if (typeof params.projectPlacementIsGit === "boolean") {
        return params.projectPlacementIsGit;
      }

      const cwd = params.cwd?.trim();
      if (!cwd) {
        return null;
      }
      const cachedCheckout = queryClient.getQueryData<CheckoutStatusPayload>(
        checkoutStatusQueryKey(serverId, cwd)
      );
      if (typeof cachedCheckout?.isGit === "boolean") {
        return cachedCheckout.isGit;
      }
      if (typeof params.checkoutStatusIsGit === "boolean") {
        return params.checkoutStatusIsGit;
      }
      return null;
    },
    [queryClient, serverId]
  );
  const resolveCurrentExplorerCheckout =
    useCallback((): ExplorerCheckoutContext | null => {
      if (!resolvedAgentId) {
        return null;
      }
      const currentAgent = useSessionStore
        .getState()
        .sessions[serverId]?.agents?.get(resolvedAgentId);
      const cwd = currentAgent?.cwd?.trim();
      const isGit = resolveCachedCheckoutIsGit({
        cwd,
        projectPlacementIsGit: currentAgent?.projectPlacement?.checkout?.isGit,
        checkoutStatusIsGit: checkout?.isGit,
      });
      if (!cwd || typeof isGit !== "boolean") {
        return null;
      }
      return { serverId, cwd, isGit };
    }, [
      resolveCachedCheckoutIsGit,
      resolvedAgentId,
      checkout?.isGit,
      serverId,
    ]);
  const openExplorerForActiveCheckout = useCallback(() => {
    const checkoutContext = resolveCurrentExplorerCheckout();
    logAgentExplorer("openExplorerForActiveCheckout", {
      hasCheckoutContext: Boolean(checkoutContext),
      checkoutContext,
    });
    if (checkoutContext) {
      activateExplorerTabForCheckout(checkoutContext);
    }
    openFileExplorer();
  }, [
    activateExplorerTabForCheckout,
    openFileExplorer,
    resolveCurrentExplorerCheckout,
  ]);
  const handleToggleExplorer = useCallback(() => {
    logAgentExplorer("handleToggleExplorer", {
      isExplorerOpen,
      mobileView,
      isMobile,
    });
    if (isExplorerOpen) {
      toggleFileExplorer();
      return;
    }
    openExplorerForActiveCheckout();
  }, [
    isExplorerOpen,
    isMobile,
    mobileView,
    openExplorerForActiveCheckout,
    toggleFileExplorer,
  ]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }
    const scope = `agent:${serverId}:${agentId ?? "unknown"}`;
    const stop = startPerfMonitor(scope);
    return stop;
  }, [serverId, agentId]);

  // Swipe-left gesture to open explorer sidebar on mobile
  const explorerOpenGesture = useExplorerOpenGesture({
    enabled: isMobile && mobileView === "agent",
    onOpen: openExplorerForActiveCheckout,
  });

  // Handle hardware back button - close explorer sidebar first, then navigate back
  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isExplorerOpen) {
        closeToAgent();
        return true; // Prevent default back navigation
      }
      return false; // Let default back navigation happen
    });

    return () => handler.remove();
  }, [isExplorerOpen, closeToAgent]);

  const activeExplorerCheckout = useMemo<ExplorerCheckoutContext | null>(() => {
    const cwd = agent?.cwd?.trim();
    const isGit = resolveCachedCheckoutIsGit({
      cwd,
      projectPlacementIsGit: agent?.projectPlacement?.checkout?.isGit,
      checkoutStatusIsGit: checkout?.isGit,
    });
    if (!cwd || typeof isGit !== "boolean") {
      return null;
    }
    return { serverId, cwd, isGit };
  }, [
    agent?.cwd,
    agent?.projectPlacement?.checkout?.isGit,
    resolveCachedCheckoutIsGit,
    checkout?.isGit,
    serverId,
  ]);

  useEffect(() => {
    setActiveExplorerCheckout(activeExplorerCheckout);
  }, [activeExplorerCheckout, setActiveExplorerCheckout]);

  useEffect(() => {
    if (!activeExplorerCheckout) {
      return;
    }
    activateExplorerTabForCheckout(activeExplorerCheckout);
  }, [activateExplorerTabForCheckout, activeExplorerCheckout]);

  useEffect(
    () => () => {
      setActiveExplorerCheckout(null);
    },
    [setActiveExplorerCheckout]
  );

  // Select only the specific stream tail - use stable empty array to avoid infinite loop
  const streamItemsRaw = useSessionStore((state) =>
    resolvedAgentId
      ? state.sessions[serverId]?.agentStreamTail?.get(resolvedAgentId)
      : undefined
  );
  const streamItems = streamItemsRaw ?? EMPTY_STREAM_ITEMS;

  const pendingCreate = useCreateFlowStore((state) => state.pending);
  const clearPendingCreate = useCreateFlowStore((state) => state.clear);
  const isPendingCreateForRoute =
    Boolean(pendingCreate) &&
    pendingCreate?.serverId === serverId &&
    pendingCreate?.agentId === resolvedAgentId;

  // Select only the specific initializing state
  const isInitializingFromMap = useSessionStore((state) =>
    resolvedAgentId
      ? (state.sessions[serverId]?.initializingAgents?.get(resolvedAgentId) ??
        false)
      : false
  );
  const historySyncGeneration = useSessionStore(
    (state) => state.sessions[serverId]?.historySyncGeneration ?? 0
  );
  const agentHistorySyncGeneration = useSessionStore((state) =>
    resolvedAgentId
      ? (state.sessions[serverId]?.agentHistorySyncGeneration?.get(
          resolvedAgentId
        ) ?? -1)
      : -1
  );
  const hasHydratedHistoryBefore = agentHistorySyncGeneration >= 0;

  // Select raw pending permissions - filter with useMemo to avoid new Map on every render
  const allPendingPermissions = useSessionStore(
    (state) => state.sessions[serverId]?.pendingPermissions
  );
  const setAgents = useSessionStore((state) => state.setAgents);
  const setAgentStreamTail = useSessionStore(
    (state) => state.setAgentStreamTail
  );
  const setPendingPermissions = useSessionStore(
    (state) => state.setPendingPermissions
  );
  const pendingPermissions = useMemo(() => {
    if (!(allPendingPermissions && resolvedAgentId)) {
      return new Map();
    }
    const filtered = new Map();
    for (const [key, perm] of allPendingPermissions) {
      if (perm.agentId === resolvedAgentId) {
        filtered.set(key, perm);
      }
    }
    return filtered;
  }, [allPendingPermissions, resolvedAgentId]);

  const hasSession = useSessionStore((state) =>
    Boolean(state.sessions[serverId])
  );
  const focusedAgentId = useSessionStore(
    (state) => state.sessions[serverId]?.focusedAgentId ?? null
  );
  const { ensureAgentIsInitialized, refreshAgent } = useAgentInitialization({
    serverId,
    client: hasSession ? client : null,
  });
  const [missingAgentState, setMissingAgentState] =
    useState<AgentScreenMissingState>({
      kind: "idle",
    });
  const reconnectToastArmedRef = useRef(false);
  const initAttemptTokenRef = useRef(0);
  const setFocusedAgentId = useCallback(
    // biome-ignore lint/nursery/noShadow: intentional variable scoping
    (agentId: string | null) => {
      useSessionStore.getState().setFocusedAgentId(serverId, agentId);
    },
    [serverId]
  );

  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const bottomInset = useSharedValue(insets.bottom);

  useEffect(() => {
    bottomInset.value = insets.bottom;
  }, [insets.bottom, bottomInset]);

  const animatedKeyboardStyle = useAnimatedStyle(() => {
    "worklet";
    const absoluteHeight = Math.abs(keyboardHeight.value);
    const shift = Math.max(0, absoluteHeight - bottomInset.value);
    return {
      transform: [{ translateY: -shift }],
    };
  });

  const handleHistorySyncFailure = useCallback(
    ({ origin, error }: { origin: "focus" | "entry"; error: unknown }) => {
      if (resolvedAgentId) {
        console.warn("[AgentScreen] history sync failed", {
          origin,
          agentId: resolvedAgentId,
          error,
        });
      }
      const message = toErrorMessage(error);
      setMissingAgentState((prev) => {
        if (prev.kind === "error" && prev.message === message) {
          return prev;
        }
        return { kind: "error", message };
      });
    },
    [resolvedAgentId]
  );

  const ensureInitializedWithSyncErrorHandling = useCallback(
    (origin: "focus" | "entry") => {
      if (!resolvedAgentId) {
        return;
      }
      ensureAgentIsInitialized(resolvedAgentId).catch((error) => {
        handleHistorySyncFailure({ origin, error });
      });
    },
    [ensureAgentIsInitialized, handleHistorySyncFailure, resolvedAgentId]
  );

  useEffect(() => {
    if (connectionStatus === "online") {
      reconnectToastArmedRef.current = false;
      return;
    }
    if (connectionStatus === "idle") {
      return;
    }
    if (!reconnectToastArmedRef.current) {
      reconnectToastArmedRef.current = true;
      toast.show("Reconnecting...", {
        durationMs: 2200,
        testID: "agent-reconnecting-toast",
      });
    }
  }, [connectionStatus, toast]);

  useFocusEffect(
    useCallback(() => {
      if (!(resolvedAgentId && isConnected && hasSession)) {
        return;
      }
      ensureInitializedWithSyncErrorHandling("focus");
    }, [
      ensureInitializedWithSyncErrorHandling,
      hasSession,
      isConnected,
      resolvedAgentId,
    ])
  );

  const isGitCheckout = activeExplorerCheckout?.isGit ?? false;
  const isArchivingCurrentAgent = Boolean(
    resolvedAgentId && isArchivingAgent({ serverId, agentId: resolvedAgentId })
  );
  const hasRedirectedArchivedAgentRef = useRef(false);

  useEffect(() => {
    if (!resolvedAgentId) {
      hasRedirectedArchivedAgentRef.current = false;
      return;
    }
    if (!agent?.archivedAt) {
      hasRedirectedArchivedAgentRef.current = false;
      return;
    }
    if (hasRedirectedArchivedAgentRef.current) {
      return;
    }
    hasRedirectedArchivedAgentRef.current = true;
    // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
    router.replace(buildHostAgentDraftRoute(serverId) as any);
  }, [agent?.archivedAt, resolvedAgentId, router, serverId]);

  useEffect(() => {
    if (!resolvedAgentId) {
      setFocusedAgentId(null);
      return;
    }

    setFocusedAgentId(resolvedAgentId);
    return () => {
      setFocusedAgentId(null);
    };
  }, [resolvedAgentId, setFocusedAgentId]);

  const isInitializing = resolvedAgentId
    ? isInitializingFromMap !== false
    : false;
  const isHistorySyncing = useMemo(() => {
    if (!(resolvedAgentId && isInitializing)) {
      return false;
    }
    const initKey = getInitKey(serverId, resolvedAgentId);
    return Boolean(getInitDeferred(initKey));
  }, [resolvedAgentId, isInitializing, serverId]);
  const needsAuthoritativeSync = useMemo(() => {
    if (!resolvedAgentId) {
      return false;
    }
    return agentHistorySyncGeneration < historySyncGeneration;
  }, [agentHistorySyncGeneration, historySyncGeneration, resolvedAgentId]);

  const optimisticStreamItems = useMemo<StreamItem[]>(() => {
    if (!(isPendingCreateForRoute && pendingCreate)) {
      return EMPTY_STREAM_ITEMS;
    }
    return [
      {
        kind: "user_message",
        id: pendingCreate.messageId,
        text: pendingCreate.text,
        timestamp: new Date(pendingCreate.timestamp),
        ...(pendingCreate.images && pendingCreate.images.length > 0
          ? { images: pendingCreate.images }
          : {}),
      },
    ];
  }, [isPendingCreateForRoute, pendingCreate]);

  const mergedStreamItems = useMemo<StreamItem[]>(() => {
    if (optimisticStreamItems.length === 0) {
      return streamItems;
    }
    const optimistic = optimisticStreamItems[0];
    if (!optimistic) {
      return streamItems;
    }
    const alreadyHasOptimistic = streamItems.some(
      (item) => item.kind === "user_message" && item.id === optimistic.id
    );
    return alreadyHasOptimistic
      ? streamItems
      : [...optimisticStreamItems, ...streamItems];
  }, [optimisticStreamItems, streamItems]);

  const shouldUseOptimisticStream =
    isPendingCreateForRoute && optimisticStreamItems.length > 0;

  const placeholderAgent: Agent | null = useMemo(() => {
    if (!(shouldUseOptimisticStream && resolvedAgentId)) {
      return null;
    }
    const now = new Date();
    return {
      serverId,
      id: resolvedAgentId,
      provider: "claude",
      status: "running",
      createdAt: now,
      updatedAt: now,
      lastUserMessageAt: now,
      lastActivityAt: now,
      capabilities: {
        supportsStreaming: true,
        supportsSessionPersistence: false,
        supportsDynamicModes: false,
        supportsMcpServers: false,
        supportsReasoningStream: false,
        supportsToolInvocations: false,
      },
      currentModeId: null,
      availableModes: [],
      pendingPermissions: [],
      persistence: null,
      runtimeInfo: {
        provider: "claude",
        sessionId: null,
        model: null,
        modeId: null,
      },
      title: "Agent",
      cwd: ".",
      model: null,
      labels: {},
    };
  }, [resolvedAgentId, serverId, shouldUseOptimisticStream]);

  const viewState = useAgentScreenStateMachine({
    routeKey: `${serverId}:${resolvedAgentId ?? ""}`,
    input: {
      agent: agent ?? null,
      placeholderAgent,
      missingAgentState,
      isConnected,
      isArchivingCurrentAgent,
      isHistorySyncing,
      needsAuthoritativeSync,
      shouldUseOptimisticStream,
      hasHydratedHistoryBefore,
    },
  });

  const effectiveAgent = viewState.tag === "ready" ? viewState.agent : null;
  const agentModel = extractAgentModel(effectiveAgent ?? agent);
  const modelDisplayValue = agentModel ?? "Unknown";
  const providerLabel = (effectiveAgent?.provider ?? "Provider").replace(
    // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
    /^\w/,
    (m) => m.toUpperCase()
  );
  const providerSessionId =
    effectiveAgent?.runtimeInfo?.sessionId ??
    effectiveAgent?.persistence?.sessionId ??
    null;

  // Header subtitle: project path + branch (matching agent list row format)
  const _headerProjectPath = effectiveAgent
    ? deriveProjectPath(effectiveAgent.cwd, checkout)
    : null;
  useEffect(() => {
    if (!(isPendingCreateForRoute && pendingCreate)) {
      return;
    }
    const hasUserMessage = streamItems.some(
      (item) =>
        item.kind === "user_message" &&
        (item.id === pendingCreate.messageId ||
          item.text === pendingCreate.text)
    );
    if (agent && hasUserMessage) {
      if (
        resolvedAgentId &&
        pendingCreate.images &&
        pendingCreate.images.length > 0
      ) {
        setAgentStreamTail(serverId, (prev) => {
          const current = prev.get(resolvedAgentId);
          if (!current) {
            return prev;
          }

          const merged = mergePendingCreateImages({
            streamItems: current,
            messageId: pendingCreate.messageId,
            text: pendingCreate.text,
            images: pendingCreate.images,
          });
          if (merged === current) {
            return prev;
          }

          const next = new Map(prev);
          next.set(resolvedAgentId, merged);
          return next;
        });
      }
      clearPendingCreate();
    }
  }, [
    agent,
    clearPendingCreate,
    isPendingCreateForRoute,
    pendingCreate,
    resolvedAgentId,
    serverId,
    setAgentStreamTail,
    streamItems,
  ]);

  useEffect(() => {
    if (!(resolvedAgentId && ensureAgentIsInitialized)) {
      return;
    }

    if (!(isConnected && hasSession)) {
      return;
    }
    // On native clients, daemon stream forwarding is focused-agent only, so switching
    // agents can leave timeline gaps unless we explicitly pull timeline catch-up.
    const shouldSyncOnEntry = needsAuthoritativeSync || Platform.OS !== "web";
    if (!shouldSyncOnEntry) {
      return;
    }

    ensureInitializedWithSyncErrorHandling("entry");
  }, [
    resolvedAgentId,
    ensureInitializedWithSyncErrorHandling,
    hasSession,
    isConnected,
    needsAuthoritativeSync,
    ensureAgentIsInitialized,
  ]);

  useEffect(() => {
    // Clear stale resolution state when route target changes.
    initAttemptTokenRef.current += 1;
    setMissingAgentState({ kind: "idle" });
  }, []);

  useEffect(() => {
    if (!(resolvedAgentId && ensureAgentIsInitialized)) {
      return;
    }
    if (agent || shouldUseOptimisticStream) {
      if (missingAgentState.kind !== "idle") {
        setMissingAgentState({ kind: "idle" });
      }
      return;
    }
    if (!(isConnected && hasSession)) {
      return;
    }
    if (
      missingAgentState.kind === "resolving" ||
      missingAgentState.kind === "not_found"
    ) {
      return;
    }

    setMissingAgentState({ kind: "resolving" });
    // biome-ignore lint/nursery/noIncrementDecrement: increment in loop
    const attemptToken = ++initAttemptTokenRef.current;

    ensureAgentIsInitialized(resolvedAgentId)
      .then(async () => {
        if (attemptToken !== initAttemptTokenRef.current) {
          return;
        }
        const currentAgent = useSessionStore
          .getState()
          .sessions[serverId]?.agents.get(resolvedAgentId);
        if (!currentAgent && client) {
          const snapshot = await client.fetchAgent(resolvedAgentId);
          if (attemptToken !== initAttemptTokenRef.current) {
            return;
          }
          if (!snapshot) {
            setMissingAgentState({
              kind: "not_found",
              message: `Agent not found: ${resolvedAgentId}`,
            });
            return;
          }
          const normalized = normalizeAgentSnapshot(snapshot, serverId);
          const hydrated = {
            ...normalized,
            projectPlacement: resolveProjectPlacement({
              projectPlacement: null,
              cwd: normalized.cwd,
            }),
          };
          setAgents(serverId, (prev) => {
            const next = new Map(prev);
            next.set(hydrated.id, hydrated);
            return next;
          });
          setPendingPermissions(serverId, (prev) => {
            const next = new Map(prev);
            for (const [key, pending] of next.entries()) {
              if (pending.agentId === hydrated.id) {
                next.delete(key);
              }
            }
            for (const request of hydrated.pendingPermissions) {
              const key = derivePendingPermissionKey(hydrated.id, request);
              next.set(key, { key, agentId: hydrated.id, request });
            }
            return next;
          });
        }
        if (attemptToken !== initAttemptTokenRef.current) {
          return;
        }
        setMissingAgentState({ kind: "idle" });
      })
      .catch((error) => {
        if (attemptToken !== initAttemptTokenRef.current) {
          return;
        }
        const message = toErrorMessage(error);
        if (isNotFoundErrorMessage(message)) {
          setMissingAgentState({ kind: "not_found", message });
          return;
        }
        setMissingAgentState({ kind: "error", message });
      });
  }, [
    agent,
    client,
    ensureAgentIsInitialized,
    hasSession,
    isConnected,
    missingAgentState.kind,
    resolvedAgentId,
    serverId,
    setAgents,
    setPendingPermissions,
    shouldUseOptimisticStream,
  ]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }
    const title = agent?.title || "Agent";
    document.title = title;
  }, [agent?.title]);

  // Clear attention as soon as the user is focused on this agent screen.
  useEffect(() => {
    const clearAgentId = resolvedAgentId?.trim();
    if (!(clearAgentId && client)) {
      return;
    }
    if (
      !shouldClearAgentAttentionOnView({
        agentId: clearAgentId,
        focusedAgentId,
        isConnected,
        requiresAttention: agent?.requiresAttention,
      })
    ) {
      return;
    }
    client.clearAgentAttention(clearAgentId);
  }, [
    agent?.requiresAttention,
    client,
    focusedAgentId,
    isConnected,
    resolvedAgentId,
  ]);

  const handleRefreshAgent = useCallback(() => {
    if (!(resolvedAgentId && hasSession)) {
      return;
    }
    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void refreshAgent(resolvedAgentId).catch((error) => {
      console.warn("[AgentScreen] refreshAgent failed", {
        agentId: resolvedAgentId,
        error,
      });
    });
  }, [hasSession, refreshAgent, resolvedAgentId]);

  const handleCopyMeta = useCallback(
    async (label: string, value: string | null | undefined) => {
      if (!value) {
        return;
      }
      try {
        await Clipboard.setStringAsync(value);
        toast.show(`Copied ${label}`, {
          variant: "success",
          icon: (
            <CheckCircle2
              color={theme.colors.primary}
              size={theme.iconSize.md}
            />
          ),
        });
      } catch {
        toast.error("Copy failed");
      }
    },
    [theme.colors.primary, toast, theme.iconSize.md]
  );

  const shouldEmitHistoryRefreshToast =
    viewState.tag === "ready" &&
    viewState.sync.status === "catching_up" &&
    viewState.sync.shouldEmitHistoryRefreshToast;
  const shouldEmitSyncErrorToast =
    viewState.tag === "ready" &&
    viewState.sync.status === "sync_error" &&
    viewState.sync.shouldEmitSyncErrorToast;

  useEffect(() => {
    if (!shouldEmitHistoryRefreshToast) {
      return;
    }
    toast.show("Refreshing agent history...", {
      durationMs: 2200,
      testID: "agent-history-refresh-toast",
    });
  }, [shouldEmitHistoryRefreshToast, toast]);

  useEffect(() => {
    if (!shouldEmitSyncErrorToast) {
      return;
    }
    toast.error("Failed to refresh agent. Retrying in background.");
  }, [shouldEmitSyncErrorToast, toast]);

  if (viewState.tag === "not_found") {
    return (
      <View style={styles.container} testID="agent-not-found">
        <MenuHeader title="Agent" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Agent not found</Text>
        </View>
      </View>
    );
  }

  if (viewState.tag === "error") {
    return (
      <View style={styles.container} testID="agent-load-error">
        <MenuHeader title="Agent" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load agent</Text>
          <Text style={styles.statusText}>{viewState.message}</Text>
        </View>
      </View>
    );
  }

  if (viewState.tag === "boot" || !effectiveAgent) {
    return (
      <View style={styles.container} testID="agent-loading">
        <MenuHeader title="Agent" />
        <View style={styles.errorContainer}>
          <ActivityIndicator
            color={theme.colors.foregroundMuted}
            size="large"
          />
        </View>
      </View>
    );
  }

  const mainContent = (
    <View style={styles.outerContainer}>
      <FileDropZone
        disabled={isArchivingCurrentAgent}
        onFilesDropped={handleFilesDropped}
      >
        <View style={styles.container}>
          {/* Header */}
          <MenuHeader
            rightContent={
              <View style={styles.headerRightContent}>
                <HeaderToggleButton
                  accessibilityLabel={
                    isExplorerOpen ? "Close explorer" : "Open explorer"
                  }
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExplorerOpen }}
                  accessible
                  onPress={handleToggleExplorer}
                  style={styles.menuButton}
                  tooltipKeys={["mod", "E"]}
                  tooltipLabel="Toggle explorer"
                  tooltipSide="left"
                >
                  {isMobile ? (
                    checkout?.isGit ? (
                      <GitBranch
                        color={
                          isExplorerOpen
                            ? theme.colors.foreground
                            : theme.colors.foregroundMuted
                        }
                        size={theme.iconSize.lg}
                      />
                    ) : (
                      <Folder
                        color={
                          isExplorerOpen
                            ? theme.colors.foreground
                            : theme.colors.foregroundMuted
                        }
                        size={theme.iconSize.lg}
                      />
                    )
                  ) : (
                    <PanelRight
                      color={
                        isExplorerOpen
                          ? theme.colors.foreground
                          : theme.colors.foregroundMuted
                      }
                      size={theme.iconSize.md}
                    />
                  )}
                </HeaderToggleButton>
                <DropdownMenu
                  onOpenChange={(open) => {
                    if (open && agent?.cwd) {
                      checkoutStatusQuery.refresh().catch(() => {
                        /* intentional no-op */
                      });
                    }
                  }}
                >
                  <DropdownMenuTrigger
                    style={styles.menuButton}
                    testID="agent-overflow-menu"
                  >
                    <MoreVertical
                      color={theme.colors.foregroundMuted}
                      size={isMobile ? theme.iconSize.lg : theme.iconSize.md}
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    testID="agent-overflow-content"
                    width={DROPDOWN_WIDTH}
                  >
                    <View style={styles.menuMetaContainer}>
                      <Pressable
                        onPress={() => {
                          // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                          void handleCopyMeta("Directory", effectiveAgent.cwd);
                        }}
                        style={({ hovered, pressed }) => [
                          styles.menuMetaRow,
                          (hovered || pressed) && styles.menuMetaRowActive,
                        ]}
                      >
                        <Text numberOfLines={1} style={styles.menuMetaLabel}>
                          Directory
                        </Text>
                        <Text
                          ellipsizeMode="middle"
                          numberOfLines={1}
                          style={styles.menuMetaValue}
                        >
                          {shortenPath(effectiveAgent.cwd)}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                          void handleCopyMeta("Model", modelDisplayValue);
                        }}
                        style={({ hovered, pressed }) => [
                          styles.menuMetaRow,
                          (hovered || pressed) && styles.menuMetaRowActive,
                        ]}
                      >
                        <Text numberOfLines={1} style={styles.menuMetaLabel}>
                          Model
                        </Text>
                        <Text
                          ellipsizeMode="middle"
                          numberOfLines={1}
                          style={styles.menuMetaValue}
                        >
                          {modelDisplayValue}
                        </Text>
                      </Pressable>

                      {checkout?.isGit &&
                      checkout.currentBranch &&
                      checkout.currentBranch !== "HEAD" ? (
                        <Pressable
                          onPress={() => {
                            if (checkoutStatusQuery.isFetching) {
                              return;
                            }
                            // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                            void handleCopyMeta(
                              "Branch",
                              checkout.currentBranch
                            );
                          }}
                          style={({ hovered, pressed }) => [
                            styles.menuMetaRow,
                            (hovered || pressed) && styles.menuMetaRowActive,
                          ]}
                        >
                          <Text numberOfLines={1} style={styles.menuMetaLabel}>
                            Branch
                          </Text>
                          <Text
                            ellipsizeMode="middle"
                            numberOfLines={1}
                            style={styles.menuMetaValue}
                          >
                            {checkoutStatusQuery.isFetching
                              ? "Fetching…"
                              : checkout.currentBranch}
                          </Text>
                        </Pressable>
                      ) : null}

                      <Pressable
                        onPress={() => {
                          // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                          void handleCopyMeta(
                            "OpenPlane ID",
                            effectiveAgent.id
                          );
                        }}
                        style={({ hovered, pressed }) => [
                          styles.menuMetaRow,
                          (hovered || pressed) && styles.menuMetaRowActive,
                        ]}
                      >
                        <Text numberOfLines={1} style={styles.menuMetaLabel}>
                          OpenPlane ID
                        </Text>
                        <Text
                          ellipsizeMode="middle"
                          numberOfLines={1}
                          style={styles.menuMetaValue}
                        >
                          {effectiveAgent.id}
                        </Text>
                      </Pressable>

                      <Pressable
                        disabled={!providerSessionId}
                        onPress={() => {
                          // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                          void handleCopyMeta(
                            `${providerLabel} ID`,
                            providerSessionId
                          );
                        }}
                        style={({ hovered, pressed }) => [
                          styles.menuMetaRow,
                          providerSessionId &&
                            (hovered || pressed) &&
                            styles.menuMetaRowActive,
                        ]}
                      >
                        <Text numberOfLines={1} style={styles.menuMetaLabel}>
                          {providerLabel} ID
                        </Text>
                        <Text
                          ellipsizeMode="middle"
                          numberOfLines={1}
                          style={[
                            styles.menuMetaValue,
                            !providerSessionId && styles.menuMetaValueError,
                          ]}
                        >
                          {providerSessionId ?? "Not available"}
                        </Text>
                      </Pressable>
                    </View>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      disabled={isInitializing}
                      leading={
                        <RotateCcw
                          color={theme.colors.foreground}
                          size={theme.iconSize.md}
                        />
                      }
                      onSelect={handleRefreshAgent}
                      trailing={
                        isInitializing ? (
                          <ActivityIndicator
                            color={theme.colors.primary}
                            size="small"
                            style={styles.menuItemSpinner}
                          />
                        ) : null
                      }
                    >
                      {isInitializing ? "Refreshing..." : "Refresh"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </View>
            }
            title={effectiveAgent.title || "Agent"}
          />

          {/* Content Area with Keyboard Animation */}
          <View style={styles.contentContainer}>
            <ReanimatedAnimated.View
              style={[styles.content, animatedKeyboardStyle]}
            >
              <AgentStreamView
                agent={effectiveAgent}
                agentId={effectiveAgent.id}
                pendingPermissions={pendingPermissions}
                serverId={serverId}
                streamItems={
                  shouldUseOptimisticStream ? mergedStreamItems : streamItems
                }
              />
            </ReanimatedAnimated.View>
          </View>

          {/* Agent Input Area */}
          {resolvedAgentId && !isArchivingCurrentAgent && (
            <AgentInputArea
              agentId={resolvedAgentId}
              autoFocus
              onAddImages={handleAddImagesCallback}
              serverId={serverId}
            />
          )}

          {viewState.tag === "ready" &&
          viewState.sync.status === "catching_up" &&
          viewState.sync.ui === "overlay" ? (
            <View
              style={styles.historySyncOverlay}
              testID="agent-history-overlay"
            >
              <ActivityIndicator
                color={theme.colors.foregroundMuted}
                size="large"
              />
            </View>
          ) : null}
        </View>
      </FileDropZone>

      {/* Explorer Sidebar - Desktop: inline, Mobile: overlay */}
      {!isMobile && isExplorerOpen && resolvedAgentId && (
        <ExplorerSidebar
          agentId={resolvedAgentId}
          cwd={effectiveAgent.cwd}
          isGit={isGitCheckout}
          serverId={serverId}
        />
      )}

      {isArchivingCurrentAgent ? (
        <View style={styles.archivingOverlay} testID="agent-archiving-overlay">
          <ActivityIndicator color={theme.colors.foreground} size="large" />
          <Text style={styles.archivingTitle}>Archiving agent...</Text>
          <Text style={styles.archivingSubtitle}>
            Please wait while we archive this agent.
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <>
      {isMobile ? (
        <GestureDetector gesture={explorerOpenGesture} touchAction="pan-y">
          {mainContent}
        </GestureDetector>
      ) : (
        mainContent
      )}

      {/* Mobile Explorer Sidebar Overlay */}
      {isMobile && resolvedAgentId && (
        <ExplorerSidebar
          agentId={resolvedAgentId}
          cwd={effectiveAgent.cwd}
          isGit={isGitCheckout}
          serverId={serverId}
        />
      )}
    </>
  );
}

function AgentSessionUnavailableState({
  onBack,
  serverLabel,
  connectionStatus,
  lastError,
  isUnknownDaemon = false,
}: {
  onBack: () => void;
  serverLabel: string;
  connectionStatus: HostRuntimeConnectionStatus;
  lastError: string | null;
  isUnknownDaemon?: boolean;
}) {
  if (isUnknownDaemon) {
    return (
      <View style={styles.container}>
        <BackHeader onBack={onBack} title="Agent" />
        <View style={styles.centerState}>
          <Text style={styles.errorText}>
            Cannot open this agent because {serverLabel} is not configured on
            this device.
          </Text>
          <Text style={styles.statusText}>
            Add the host in Settings or open an agent on a configured server to
            continue.
          </Text>
        </View>
      </View>
    );
  }

  const isConnecting = connectionStatus === "connecting";
  const isPreparingSession = connectionStatus === "online";

  return (
    <View style={styles.container}>
      <BackHeader onBack={onBack} title="Agent" />
      <View style={styles.centerState}>
        {isConnecting || isPreparingSession ? (
          <>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>
              {isPreparingSession
                ? `Preparing ${serverLabel} session...`
                : `Connecting to ${serverLabel}...`}
            </Text>
            <Text style={styles.statusText}>
              {isPreparingSession
                ? "We will show this agent in a moment."
                : "We will show this agent once the host is online."}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.offlineTitle}>
              Reconnecting to {serverLabel}...
            </Text>
            <Text style={styles.offlineDescription}>
              We will show this agent again as soon as the host is reachable.
            </Text>
            {lastError ? (
              <Text style={styles.offlineDetails}>{lastError}</Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  outerContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: theme.colors.surface0,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface0,
  },
  headerRightContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    overflow: "hidden",
  },
  content: {
    flex: 1,
  },
  historySyncOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: theme.colors.surface0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 40,
  },
  archivingOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(8, 10, 14, 0.86)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[8],
    gap: theme.spacing[3],
    zIndex: 50,
  },
  archivingTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground,
    textAlign: "center",
  },
  archivingSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
    textAlign: "center",
  },
  loadingText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.foregroundMuted,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[6],
    gap: theme.spacing[3],
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.foregroundMuted,
    textAlign: "center",
  },
  statusText: {
    marginTop: theme.spacing[2],
    textAlign: "center",
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
  },
  errorDetails: {
    marginTop: theme.spacing[1],
    textAlign: "center",
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
  },
  offlineTitle: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground,
    textAlign: "center",
  },
  offlineDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
    textAlign: "center",
  },
  offlineDetails: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.foregroundMuted,
    textAlign: "center",
  },
  menuButton: {
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
  },
  menuMetaContainer: {
    paddingVertical: theme.spacing[1],
  },
  menuMetaRow: {
    minHeight: 32,
    paddingHorizontal: theme.spacing[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[3],
  },
  menuMetaRowActive: {
    backgroundColor: theme.colors.surface2,
  },
  menuMetaLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
    flexShrink: 0,
  },
  menuMetaValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
    flex: 1,
    minWidth: 0,
    textAlign: "right",
  },
  menuMetaValueError: {
    color: theme.colors.destructive,
  },
  menuItemSpinner: {
    marginLeft: "auto",
  },
}));
