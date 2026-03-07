import Constants from "expo-constants";
import { router, useLocalSearchParams } from "expo-router";
import {
  Check,
  Globe,
  Monitor,
  Moon,
  RotateCw,
  Settings,
  Sun,
  Trash2,
} from "lucide-react-native";
import type { MutableRefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  StyleSheet,
  UnistylesRuntime,
  useUnistyles,
} from "react-native-unistyles";
import {
  AdaptiveModalSheet,
  AdaptiveTextInput,
} from "@/components/adaptive-modal-sheet";
import { AddHostMethodModal } from "@/components/add-host-method-modal";
import { AddHostModal } from "@/components/add-host-modal";
import { MenuHeader } from "@/components/headers/menu-header";
import { NameHostModal } from "@/components/name-host-modal";
import { PairLinkModal } from "@/components/pair-link-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  type HostConnection,
  type HostProfile,
  useDaemonRegistry,
} from "@/contexts/daemon-registry-context";
import { type AppSettings, useAppSettings } from "@/hooks/use-settings";
import {
  getHostRuntimeStore,
  isHostRuntimeConnected,
  useHostRuntimeSession,
} from "@/runtime/host-runtime";
import { useSessionStore } from "@/stores/session-store";
import { generateMessageId } from "@/types/stream";
import { confirmDialog } from "@/utils/confirm-dialog";
import {
  formatConnectionStatus,
  getConnectionStatusTone,
} from "@/utils/daemons";
import {
  type DesktopPermissionKind,
  type DesktopPermissionSnapshot,
  type DesktopPermissionStatus,
  type DesktopPermissionsNativeHelperContext,
  getDesktopPermissionSnapshot,
  requestDesktopPermission,
  shouldShowDesktopPermissionSection,
} from "@/utils/desktop-permissions";
import {
  claimNativeHelperShortcutOwnership,
  isNativeHelperShortcutOwner,
  releaseNativeHelperShortcutOwnership,
} from "@/utils/native-helper-shortcut-owner";
import {
  formatNativeHelperShortcut,
  getDefaultNativeHelperShortcutConfig,
  type NativeHelperShortcutConfig,
  type NativeHelperShortcutKind,
  normalizeNativeHelperShortcutKeys,
} from "@/utils/native-helper-shortcuts";

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      clearTimeout(timeout);
      resolve();
    }, ms);
  });

const NATIVE_HELPER_SHORTCUT_ROWS: ReadonlyArray<{
  kind: NativeHelperShortcutKind;
  title: string;
  detail: string;
}> = [
  {
    kind: "pushToTalk",
    title: "Push to talk",
    detail: "Hold to start/stop dictation.",
  },
  {
    kind: "toggleRecording",
    title: "Toggle recording",
    detail: "Start or stop dictation in one shortcut.",
  },
  {
    kind: "pasteLastTranscript",
    title: "Paste last transcript",
    detail: "Paste the last finalized dictation into focused app.",
  },
  {
    kind: "newNote",
    title: "Open notes window",
    detail: "Bring OpenBeam forward and open a fresh draft note.",
  },
];

function getShortcutKeyCodes(
  config: NativeHelperShortcutConfig,
  kind: NativeHelperShortcutKind
): number[] {
  // biome-ignore lint/style/useDefaultSwitchClause: necessary for this context
  switch (kind) {
    case "pushToTalk":
      return config.pushToTalk;
    case "toggleRecording":
      return config.toggleRecording;
    case "pasteLastTranscript":
      return config.pasteLastTranscript;
    case "newNote":
      return config.newNote;
  }
}

function withUpdatedShortcut(
  config: NativeHelperShortcutConfig,
  kind: NativeHelperShortcutKind,
  keyCodes: number[]
): NativeHelperShortcutConfig {
  // biome-ignore lint/style/useDefaultSwitchClause: necessary for this context
  switch (kind) {
    case "pushToTalk":
      return { ...config, pushToTalk: keyCodes };
    case "toggleRecording":
      return { ...config, toggleRecording: keyCodes };
    case "pasteLastTranscript":
      return { ...config, pasteLastTranscript: keyCodes };
    case "newNote":
      return { ...config, newNote: keyCodes };
  }
}

function getShortcutRowDefinition(kind: NativeHelperShortcutKind): {
  kind: NativeHelperShortcutKind;
  title: string;
  detail: string;
} {
  return (
    NATIVE_HELPER_SHORTCUT_ROWS.find((entry) => entry.kind === kind) ?? {
      kind,
      title: kind,
      detail: "",
    }
  );
}

const styles = StyleSheet.create((theme) => ({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface0,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.lg,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface0,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing[4],
    paddingTop: theme.spacing[6],
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  section: {
    marginBottom: theme.spacing[6],
  },
  sectionTitle: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.normal,
    marginBottom: theme.spacing[3],
    marginLeft: theme.spacing[1],
  },
  label: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.normal,
    marginBottom: theme.spacing[2],
  },
  input: {
    backgroundColor: theme.colors.surface0,
    color: theme.colors.foreground,
    padding: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: theme.fontSize.base,
  },
  // Host card styles
  hostCard: {
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing[3],
    overflow: "hidden",
  },
  hostCardContent: {
    padding: theme.spacing[4],
    gap: theme.spacing[2],
  },
  hostHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  hostHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    flexShrink: 0,
  },
  hostLabel: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.normal,
    flex: 1,
    flexShrink: 1,
  },
  hostError: {
    color: theme.colors.palette.red[300],
    fontSize: theme.fontSize.xs,
  },
  // Status pill
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  statusPillMobile: {
    alignItems: "center",
    justifyContent: "center",
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.normal,
  },
  connectionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface3,
    maxWidth: 170,
  },
  connectionPillMobile: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: theme.borderRadius.full,
  },
  connectionText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.normal,
    color: theme.colors.foregroundMuted,
    flexShrink: 1,
  },
  versionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface3,
    maxWidth: 200,
  },
  hostSettingsButton: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
    marginLeft: theme.spacing[2],
  },
  hostSettingsButtonActive: {
    backgroundColor: theme.colors.surface3,
  },
  advancedTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "transparent",
  },
  advancedTriggerText: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  disabled: {
    opacity: theme.opacity[50],
  },
  testResultText: {
    fontSize: theme.fontSize.xs,
  },
  // Add host button
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
  },
  addButtonText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.normal,
  },
  // Add/Edit form
  formCard: {
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
    gap: theme.spacing[4],
  },
  formTitle: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.normal,
  },
  formField: {
    gap: theme.spacing[2],
  },
  formActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacing[2],
  },
  formButton: {
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  formButtonPrimary: {
    backgroundColor: theme.colors.palette.blue[500],
    borderColor: theme.colors.palette.blue[500],
  },
  formButtonText: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.normal,
  },
  formButtonPrimaryText: {
    color: theme.colors.palette.white,
  },
  // Audio settings card
  audioCard: {
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
  },
  audioRowBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  audioRowContent: {
    flex: 1,
    marginRight: theme.spacing[3],
  },
  audioRowTitle: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
  },
  permissionSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[2],
    marginBottom: theme.spacing[3],
  },
  permissionRefreshButton: {
    width: 34,
    height: 34,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionRefreshButtonDisabled: {
    opacity: theme.opacity[50],
  },
  permissionRowActions: {
    alignItems: "flex-end",
    gap: theme.spacing[1],
  },
  permissionStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface3,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 4,
    minWidth: 88,
    justifyContent: "center",
  },
  permissionStatusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.normal,
    color: theme.colors.foregroundMuted,
  },
  permissionDetailText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.xs,
    maxWidth: 220,
    textAlign: "right",
  },
  shortcutRowContent: {
    flex: 1,
    marginRight: theme.spacing[3],
    gap: 2,
  },
  shortcutDetailText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.xs,
  },
  shortcutValueText: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
  },
  shortcutCaptureCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    gap: theme.spacing[1],
  },
  shortcutCaptureValue: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
  },
  shortcutCaptureCodes: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.xs,
  },
  shortcutCaptureHint: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.xs,
    lineHeight: 18,
  },
  aboutValue: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.normal,
  },
  // Empty state
  emptyCard: {
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
  },
  emptyText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    textAlign: "center",
  },
  // Dev section
  devCard: {
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  devButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
  },
  devButtonBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  devButtonContent: {
    flex: 1,
  },
  devButtonTitle: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
  },
  devButtonDescription: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
}));

function resolveAppVersion(): string | null {
  const expoVersion = Constants.expoConfig?.version;
  if (typeof expoVersion === "string" && expoVersion.trim().length > 0) {
    return expoVersion.trim();
  }

  // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
  const manifestVersion = (Constants as any).manifest?.version;
  if (
    typeof manifestVersion === "string" &&
    manifestVersion.trim().length > 0
  ) {
    return manifestVersion.trim();
  }

  return null;
}

function formatDaemonVersionBadge(version: string | null): string | null {
  const daemonVersion = version?.trim();
  if (!daemonVersion) {
    return null;
  }
  if (daemonVersion.startsWith("v")) {
    return daemonVersion;
  }
  return `v${daemonVersion}`;
}

export default function SettingsScreen() {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    editHost?: string;
    serverId?: string;
  }>();
  const routeServerId =
    typeof params.serverId === "string" ? params.serverId.trim() : "";
  const {
    settings,
    isLoading: settingsLoading,
    updateSettings,
  } = useAppSettings();
  const {
    daemons,
    isLoading: daemonLoading,
    updateHost,
    removeHost,
    removeConnection,
  } = useDaemonRegistry();
  const [isAddHostMethodVisible, setIsAddHostMethodVisible] = useState(false);
  const [isDirectHostVisible, setIsDirectHostVisible] = useState(false);
  const [isPasteLinkVisible, setIsPasteLinkVisible] = useState(false);
  const [addConnectionTargetServerId, setAddConnectionTargetServerId] =
    useState<string | null>(null);
  const [pendingEditReopenServerId, setPendingEditReopenServerId] = useState<
    string | null
  >(null);
  const [pendingNameHost, setPendingNameHost] = useState<{
    serverId: string;
    hostname: string | null;
  } | null>(null);
  const [pendingRemoveHost, setPendingRemoveHost] =
    useState<HostProfile | null>(null);
  const [isRemovingHost, setIsRemovingHost] = useState(false);
  const [editingDaemon, setEditingDaemon] = useState<HostProfile | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [desktopPermissionSnapshot, setDesktopPermissionSnapshot] =
    useState<DesktopPermissionSnapshot | null>(null);
  const [isRefreshingDesktopPermissions, setIsRefreshingDesktopPermissions] =
    useState(false);
  const [requestingDesktopPermission, setRequestingDesktopPermission] =
    useState<DesktopPermissionKind | null>(null);
  const [editingNativeHelperShortcutKind, setEditingNativeHelperShortcutKind] =
    useState<NativeHelperShortcutKind | null>(null);
  const [
    capturedNativeHelperShortcutKeyCodes,
    setCapturedNativeHelperShortcutKeyCodes,
  ] = useState<number[]>([]);
  const isLoading = settingsLoading || daemonLoading;
  const showDesktopPermissionSection = shouldShowDesktopPermissionSection();
  const desktopPermissionServerId = useMemo(() => {
    if (routeServerId.length > 0) {
      const routeDaemon = daemons.find(
        (daemon) => daemon.serverId === routeServerId
      );
      if (routeDaemon) {
        return routeDaemon.serverId;
      }
    }

    const runtime = getHostRuntimeStore();
    for (const daemon of daemons) {
      if (isHostRuntimeConnected(runtime.getSnapshot(daemon.serverId))) {
        return daemon.serverId;
      }
    }
    return daemons[0]?.serverId ?? "";
  }, [daemons, routeServerId]);
  const {
    client: desktopPermissionClient,
    isConnected: isDesktopPermissionClientConnected,
  } = useHostRuntimeSession(desktopPermissionServerId);
  const desktopPermissionNativeHelper =
    useMemo<DesktopPermissionsNativeHelperContext | null>(() => {
      if (!desktopPermissionClient) {
        return null;
      }
      return {
        client: desktopPermissionClient,
        isConnected: isDesktopPermissionClientConnected,
      };
    }, [desktopPermissionClient, isDesktopPermissionClientConnected]);
  const isMountedRef = useRef(true);
  const nativeHelperEditorOwnerKeyRef = useRef(generateMessageId());
  const lastHandledEditHostRef = useRef<string | null>(null);
  const appVersion = resolveAppVersion();
  const editingServerId = editingDaemon?.serverId ?? null;
  const editingDaemonLive = editingServerId
    ? (daemons.find((daemon) => daemon.serverId === editingServerId) ?? null)
    : null;
  const pendingNameHostname = useSessionStore(
    useCallback(
      (state) => {
        if (!pendingNameHost) {
          return null;
        }
        return (
          state.sessions[pendingNameHost.serverId]?.serverInfo?.hostname ??
          pendingNameHost.hostname ??
          null
        );
      },
      [pendingNameHost]
    )
  );
  const defaultNativeHelperShortcuts = useMemo(
    () => getDefaultNativeHelperShortcutConfig(),
    []
  );
  const editingShortcutRow = useMemo(() => {
    if (!editingNativeHelperShortcutKind) {
      return null;
    }
    return getShortcutRowDefinition(editingNativeHelperShortcutKind);
  }, [editingNativeHelperShortcutKind]);
  const normalizedCapturedShortcutKeyCodes = useMemo(
    () =>
      normalizeNativeHelperShortcutKeys(capturedNativeHelperShortcutKeyCodes),
    [capturedNativeHelperShortcutKeyCodes]
  );

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  // Keep the edit modal bound to live registry state.
  useEffect(() => {
    if (!editingServerId) {
      return;
    }
    if (editingDaemonLive) {
      return;
    }
    setEditingDaemon(null);
  }, [editingDaemonLive, editingServerId]);

  const waitForCondition = useCallback(
    async (predicate: () => boolean, timeoutMs: number, intervalMs = 250) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (!isMountedRef.current) {
          return false;
        }
        if (predicate()) {
          return true;
        }
        await delay(intervalMs);
      }
      return predicate();
    },
    []
  );

  const handleEditDaemon = useCallback((profile: HostProfile) => {
    setEditingDaemon(profile);
  }, []);

  const handleCloseEditDaemon = useCallback(() => {
    if (isSavingEdit) {
      return;
    }
    setEditingDaemon(null);
  }, [isSavingEdit]);

  const closeAddConnectionFlow = useCallback(() => {
    setIsAddHostMethodVisible(false);
    setIsDirectHostVisible(false);
    setIsPasteLinkVisible(false);
    setAddConnectionTargetServerId(null);
  }, []);

  const goBackToAddConnectionMethods = useCallback(() => {
    setIsDirectHostVisible(false);
    setIsPasteLinkVisible(false);
    setIsAddHostMethodVisible(true);
  }, []);

  useEffect(() => {
    const editHost =
      typeof params.editHost === "string" ? params.editHost.trim() : "";
    if (!editHost) {
      return;
    }
    if (lastHandledEditHostRef.current === editHost) {
      return;
    }
    const profile =
      daemons.find((daemon) => daemon.serverId === editHost) ?? null;
    if (!profile) {
      return;
    }
    lastHandledEditHostRef.current = editHost;
    handleEditDaemon(profile);
  }, [daemons, handleEditDaemon, params.editHost]);

  useEffect(() => {
    if (!pendingEditReopenServerId) {
      return;
    }
    if (isAddHostMethodVisible || isDirectHostVisible || isPasteLinkVisible) {
      return;
    }
    const profile =
      daemons.find((daemon) => daemon.serverId === pendingEditReopenServerId) ??
      null;
    setPendingEditReopenServerId(null);
    setAddConnectionTargetServerId(null);
    if (profile) {
      handleEditDaemon(profile);
    }
  }, [
    daemons,
    handleEditDaemon,
    isAddHostMethodVisible,
    isDirectHostVisible,
    isPasteLinkVisible,
    pendingEditReopenServerId,
  ]);

  const refreshDesktopPermissions = useCallback(async () => {
    if (!showDesktopPermissionSection) {
      return;
    }

    setIsRefreshingDesktopPermissions(true);
    try {
      const snapshot = await getDesktopPermissionSnapshot({
        nativeHelper: desktopPermissionNativeHelper,
      });
      if (!isMountedRef.current) {
        return;
      }
      setDesktopPermissionSnapshot(snapshot);
    } catch (error) {
      console.error(
        "[Settings] Failed to load desktop permission status",
        error
      );
    } finally {
      if (isMountedRef.current) {
        setIsRefreshingDesktopPermissions(false);
      }
    }
  }, [desktopPermissionNativeHelper, showDesktopPermissionSection]);

  const handleRequestDesktopPermission = useCallback(
    async (kind: DesktopPermissionKind) => {
      if (!showDesktopPermissionSection) {
        return;
      }

      setRequestingDesktopPermission(kind);
      try {
        const status = await requestDesktopPermission({
          kind,
          nativeHelper: desktopPermissionNativeHelper,
        });
        if (!isMountedRef.current) {
          return;
        }
        setDesktopPermissionSnapshot((previous) => {
          const base: DesktopPermissionSnapshot = previous ?? {
            checkedAt: Date.now(),
            notifications: {
              state: "unknown",
              detail: "Notification status has not been checked yet.",
            },
            microphone: {
              state: "unknown",
              detail: "Microphone status has not been checked yet.",
            },
            accessibility: {
              state: "unknown",
              detail: "Accessibility status has not been checked yet.",
            },
          };

          return kind === "notifications"
            ? {
                ...base,
                checkedAt: Date.now(),
                notifications: status,
              }
            : // biome-ignore lint/style/noNestedTernary: readable inline conditional
              kind === "microphone"
              ? {
                  ...base,
                  checkedAt: Date.now(),
                  microphone: status,
                }
              : {
                  ...base,
                  checkedAt: Date.now(),
                  accessibility: status,
                };
        });
      } catch (error) {
        console.error(`[Settings] Failed to request ${kind} permission`, error);
      } finally {
        if (isMountedRef.current) {
          setRequestingDesktopPermission(null);
        }
        await refreshDesktopPermissions();
      }
    },
    [
      desktopPermissionNativeHelper,
      refreshDesktopPermissions,
      showDesktopPermissionSection,
    ]
  );

  useEffect(() => {
    if (!showDesktopPermissionSection) {
      return;
    }
    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void refreshDesktopPermissions();
  }, [refreshDesktopPermissions, showDesktopPermissionSection]);

  const closeNativeHelperShortcutEditor = useCallback(() => {
    setEditingNativeHelperShortcutKind(null);
    setCapturedNativeHelperShortcutKeyCodes([]);
  }, []);

  const openNativeHelperShortcutEditor = useCallback(
    (kind: NativeHelperShortcutKind) => {
      setEditingNativeHelperShortcutKind(kind);
      setCapturedNativeHelperShortcutKeyCodes(
        getShortcutKeyCodes(settings.nativeHelperShortcuts, kind)
      );
    },
    [settings.nativeHelperShortcuts]
  );

  const handleSaveNativeHelperShortcut = useCallback(async () => {
    if (!editingNativeHelperShortcutKind) {
      return;
    }
    if (normalizedCapturedShortcutKeyCodes.length === 0) {
      Alert.alert(
        "Shortcut required",
        "Capture at least one key before saving."
      );
      return;
    }

    try {
      const nextShortcuts = withUpdatedShortcut(
        settings.nativeHelperShortcuts,
        editingNativeHelperShortcutKind,
        normalizedCapturedShortcutKeyCodes
      );
      await updateSettings({ nativeHelperShortcuts: nextShortcuts });
      closeNativeHelperShortcutEditor();
    } catch (error) {
      console.error("[Settings] Failed to save native helper shortcut", error);
      Alert.alert("Save failed", "Unable to save shortcut. Please try again.");
    }
  }, [
    closeNativeHelperShortcutEditor,
    editingNativeHelperShortcutKind,
    normalizedCapturedShortcutKeyCodes,
    settings.nativeHelperShortcuts,
    updateSettings,
  ]);

  const handleResetAllNativeHelperShortcuts = useCallback(async () => {
    try {
      await updateSettings({
        nativeHelperShortcuts: defaultNativeHelperShortcuts,
      });
      if (editingNativeHelperShortcutKind) {
        setCapturedNativeHelperShortcutKeyCodes(
          getShortcutKeyCodes(
            defaultNativeHelperShortcuts,
            editingNativeHelperShortcutKind
          )
        );
      }
    } catch (error) {
      console.error(
        "[Settings] Failed to reset native helper shortcuts",
        error
      );
      Alert.alert("Reset failed", "Unable to reset shortcuts right now.");
    }
  }, [
    defaultNativeHelperShortcuts,
    editingNativeHelperShortcutKind,
    updateSettings,
  ]);

  useEffect(() => {
    if (!editingNativeHelperShortcutKind) {
      return;
    }
    if (!(desktopPermissionClient && isDesktopPermissionClientConnected)) {
      return;
    }

    const ownerKey = nativeHelperEditorOwnerKeyRef.current;
    const isOwner = claimNativeHelperShortcutOwnership({
      key: ownerKey,
      focused: true,
    });
    if (!isOwner) {
      return;
    }

    const unsubscribe = desktopPermissionClient.on(
      "native_helper_event",
      (message) => {
        if (!isNativeHelperShortcutOwner(ownerKey)) {
          const claimed = claimNativeHelperShortcutOwnership({
            key: ownerKey,
            focused: true,
          });
          if (!claimed) {
            return;
          }
        }
        if (message.type !== "native_helper_event") {
          return;
        }
        if (message.payload.type !== "keyDown") {
          return;
        }
        // biome-ignore lint/suspicious/noBitwiseOperators: intentional bitwise operation
        const keyCode = message.payload.payload.keyCode | 0;
        setCapturedNativeHelperShortcutKeyCodes((previous) => {
          if (previous.includes(keyCode)) {
            return previous;
          }
          return [...previous, keyCode];
        });
      }
    );

    return () => {
      unsubscribe();
      releaseNativeHelperShortcutOwnership(ownerKey);
    };
  }, [
    desktopPermissionClient,
    editingNativeHelperShortcutKind,
    isDesktopPermissionClientConnected,
  ]);

  const handleSaveEditDaemon = useCallback(
    async (nextLabelRaw: string) => {
      if (!editingServerId) {
        return;
      }
      if (isSavingEdit) {
        return;
      }

      const nextLabel = nextLabelRaw.trim();
      if (!nextLabel) {
        Alert.alert("Label required", "Enter a label for this host.");
        return;
      }

      try {
        setIsSavingEdit(true);
        await updateHost(editingServerId, { label: nextLabel });
        handleCloseEditDaemon();
      } catch (error) {
        console.error("[Settings] Failed to rename host", error);
        Alert.alert("Error", "Unable to save host");
      } finally {
        setIsSavingEdit(false);
      }
    },
    [editingServerId, handleCloseEditDaemon, isSavingEdit, updateHost]
  );

  const handleRemoveConnection = useCallback(
    async (serverId: string, connectionId: string) => {
      await removeConnection(serverId, connectionId);
    },
    [removeConnection]
  );

  const handleRemoveDaemon = useCallback((profile: HostProfile) => {
    setEditingDaemon(null);
    setPendingRemoveHost(profile);
  }, []);

  const handleAddConnectionFromModal = useCallback(() => {
    if (!editingServerId) {
      return;
    }
    const serverId = editingServerId;
    setEditingDaemon(null);
    setAddConnectionTargetServerId(serverId);
    setPendingEditReopenServerId(serverId);
    setIsAddHostMethodVisible(true);
  }, [editingServerId]);

  const handleThemeChange = useCallback(
    (newTheme: AppSettings["theme"]) => {
      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
      void updateSettings({ theme: newTheme });
      if (newTheme === "auto") {
        UnistylesRuntime.setAdaptiveThemes(true);
      } else {
        UnistylesRuntime.setAdaptiveThemes(false);
        UnistylesRuntime.setTheme(newTheme);
      }
    },
    [updateSettings]
  );

  const restartConfirmationMessage =
    "This will immediately stop the OpenBeam daemon process. The app will disconnect until it restarts.";

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MenuHeader title="Settings" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        style={styles.scrollView}
      >
        <View style={styles.content}>
          {/* Host Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hosts</Text>

            {daemons.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No hosts configured</Text>
              </View>
            ) : (
              daemons.map((daemon) => (
                <DaemonCard
                  daemon={daemon}
                  key={daemon.serverId}
                  onOpenSettings={handleEditDaemon}
                />
              ))
            )}

            <Pressable
              onPress={() => {
                setAddConnectionTargetServerId(null);
                setPendingEditReopenServerId(null);
                setIsAddHostMethodVisible(true);
              }}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>+ Add connection</Text>
            </Pressable>
          </View>

          <AddHostMethodModal
            onClose={closeAddConnectionFlow}
            onDirectConnection={() => {
              setIsAddHostMethodVisible(false);
              setIsDirectHostVisible(true);
            }}
            onPasteLink={() => {
              setIsAddHostMethodVisible(false);
              setIsPasteLinkVisible(true);
            }}
            onScanQr={() => {
              const targetServerId = addConnectionTargetServerId;
              const source = targetServerId ? "editHost" : "settings";
              const sourceServerId =
                routeServerId || targetServerId || undefined;
              closeAddConnectionFlow();
              router.push({
                pathname: "/pair-scan",
                params: targetServerId
                  ? { source, targetServerId, sourceServerId }
                  : { source, sourceServerId },
              });
            }}
            visible={isAddHostMethodVisible}
          />

          <AddHostModal
            onCancel={goBackToAddConnectionMethods}
            onClose={closeAddConnectionFlow}
            onSaved={({ serverId, hostname, isNewHost }) => {
              if (isNewHost) {
                setPendingNameHost({ serverId, hostname });
              }
            }}
            targetServerId={addConnectionTargetServerId ?? undefined}
            visible={isDirectHostVisible}
          />

          <PairLinkModal
            onCancel={goBackToAddConnectionMethods}
            onClose={closeAddConnectionFlow}
            onSaved={({ serverId, hostname, isNewHost }) => {
              if (isNewHost) {
                setPendingNameHost({ serverId, hostname });
              }
            }}
            targetServerId={addConnectionTargetServerId ?? undefined}
            visible={isPasteLinkVisible}
          />

          {pendingNameHost ? (
            <NameHostModal
              hostname={pendingNameHostname}
              onSave={(label) => {
                // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                void updateHost(pendingNameHost.serverId, { label }).finally(
                  () => {
                    setPendingNameHost(null);
                  }
                );
              }}
              onSkip={() => setPendingNameHost(null)}
              serverId={pendingNameHost.serverId}
              visible
            />
          ) : null}

          {pendingRemoveHost ? (
            <AdaptiveModalSheet
              onClose={() => {
                if (isRemovingHost) {
                  return;
                }
                setPendingRemoveHost(null);
              }}
              testID="remove-host-confirm-modal"
              title="Remove host"
              visible
            >
              <Text
                style={{ color: theme.colors.foregroundMuted, fontSize: 14 }}
              >
                Remove {pendingRemoveHost.label}? This will delete its saved
                connections.
              </Text>
              <View
                style={[styles.formActionsRow, { marginTop: theme.spacing[4] }]}
              >
                <Button
                  disabled={isRemovingHost}
                  onPress={() => setPendingRemoveHost(null)}
                  size="sm"
                  style={{ flex: 1 }}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isRemovingHost}
                  onPress={() => {
                    const serverId = pendingRemoveHost.serverId;
                    setIsRemovingHost(true);
                    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                    void removeHost(serverId)
                      .then(() => setPendingRemoveHost(null))
                      .catch((error) => {
                        console.error(
                          "[Settings] Failed to remove host",
                          error
                        );
                        Alert.alert("Error", "Unable to remove host");
                      })
                      .finally(() => setIsRemovingHost(false));
                  }}
                  size="sm"
                  style={{ flex: 1 }}
                  testID="remove-host-confirm"
                  variant="destructive"
                >
                  Remove
                </Button>
              </View>
            </AdaptiveModalSheet>
          ) : null}

          <HostDetailModal
            host={editingDaemonLive}
            isSaving={isSavingEdit}
            isScreenMountedRef={isMountedRef}
            onAddConnection={handleAddConnectionFromModal}
            onClose={handleCloseEditDaemon}
            onRemoveConnection={handleRemoveConnection}
            onRemoveHost={handleRemoveDaemon}
            // biome-ignore lint/complexity/noVoid: fire-and-forget async call
            onSave={(label) => void handleSaveEditDaemon(label)}
            restartConfirmationMessage={restartConfirmationMessage}
            visible={Boolean(editingDaemonLive)}
            waitForCondition={waitForCondition}
          />

          {editingShortcutRow ? (
            <AdaptiveModalSheet
              onClose={closeNativeHelperShortcutEditor}
              testID={`shortcut-editor-${editingShortcutRow.kind}`}
              title={`Edit ${editingShortcutRow.title}`}
              visible
            >
              <View style={{ gap: theme.spacing[3] }}>
                <Text style={styles.shortcutCaptureHint}>
                  {editingShortcutRow.detail}
                </Text>
                <View style={styles.shortcutCaptureCard}>
                  <Text style={styles.shortcutCaptureValue}>
                    {formatNativeHelperShortcut(
                      normalizedCapturedShortcutKeyCodes
                    )}
                  </Text>
                  <Text style={styles.shortcutCaptureCodes}>
                    Key codes:{" "}
                    {normalizedCapturedShortcutKeyCodes.length > 0
                      ? normalizedCapturedShortcutKeyCodes.join(", ")
                      : "None captured"}
                  </Text>
                </View>
                <Text style={styles.shortcutCaptureHint}>
                  Press shortcut keys to capture. Use Clear to start over before
                  saving.
                </Text>
                <View
                  style={[styles.formActionsRow, { gap: theme.spacing[2] }]}
                >
                  <Button
                    onPress={() => setCapturedNativeHelperShortcutKeyCodes([])}
                    size="sm"
                    style={{ flex: 1 }}
                    variant="secondary"
                  >
                    Clear
                  </Button>
                  <Button
                    onPress={() =>
                      setCapturedNativeHelperShortcutKeyCodes(
                        getShortcutKeyCodes(
                          defaultNativeHelperShortcuts,
                          editingShortcutRow.kind
                        )
                      )
                    }
                    size="sm"
                    style={{ flex: 1 }}
                    variant="secondary"
                  >
                    Use default
                  </Button>
                  <Button
                    disabled={normalizedCapturedShortcutKeyCodes.length === 0}
                    onPress={() => {
                      // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                      void handleSaveNativeHelperShortcut();
                    }}
                    size="sm"
                    style={{ flex: 1 }}
                    variant="default"
                  >
                    Save
                  </Button>
                </View>
              </View>
            </AdaptiveModalSheet>
          ) : null}

          {/* Appearance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appearance</Text>
            <View style={styles.audioCard}>
              <View style={styles.audioRow}>
                <View style={styles.audioRowContent}>
                  <Text style={styles.audioRowTitle}>Theme</Text>
                </View>
                <SegmentedControl
                  onValueChange={handleThemeChange}
                  options={[
                    {
                      value: "light",
                      label: "Light",
                      icon: ({ color, size }) => (
                        <Sun color={color} size={size} />
                      ),
                    },
                    {
                      value: "dark",
                      label: "Dark",
                      icon: ({ color, size }) => (
                        <Moon color={color} size={size} />
                      ),
                    },
                    {
                      value: "auto",
                      label: "System",
                      icon: ({ color, size }) => (
                        <Monitor color={color} size={size} />
                      ),
                    },
                  ]}
                  size="sm"
                  value={settings.theme}
                />
              </View>
            </View>
          </View>

          {showDesktopPermissionSection ? (
            <View style={styles.section}>
              <View style={styles.permissionSectionHeader}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
                  Desktop permissions
                </Text>
                <Pressable
                  accessibilityLabel="Refresh desktop permissions"
                  accessibilityRole="button"
                  disabled={
                    isRefreshingDesktopPermissions ||
                    requestingDesktopPermission !== null
                  }
                  onPress={() => {
                    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                    void refreshDesktopPermissions();
                  }}
                  style={({ pressed }) => [
                    styles.permissionRefreshButton,
                    (isRefreshingDesktopPermissions ||
                      requestingDesktopPermission !== null) &&
                      styles.permissionRefreshButtonDisabled,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <RotateCw
                    color={theme.colors.foregroundMuted}
                    size={theme.iconSize.md}
                  />
                </Pressable>
              </View>
              <View style={styles.audioCard}>
                <DesktopPermissionRow
                  isRequesting={requestingDesktopPermission === "notifications"}
                  onRequest={() => {
                    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                    void handleRequestDesktopPermission("notifications");
                  }}
                  status={desktopPermissionSnapshot?.notifications ?? null}
                  title="Notifications"
                />
                <DesktopPermissionRow
                  isRequesting={requestingDesktopPermission === "microphone"}
                  onRequest={() => {
                    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                    void handleRequestDesktopPermission("microphone");
                  }}
                  showBorder
                  status={desktopPermissionSnapshot?.microphone ?? null}
                  title="Microphone"
                />
                <DesktopPermissionRow
                  isRequesting={requestingDesktopPermission === "accessibility"}
                  onRequest={() => {
                    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                    void handleRequestDesktopPermission("accessibility");
                  }}
                  showBorder
                  status={desktopPermissionSnapshot?.accessibility ?? null}
                  title="Accessibility"
                />
              </View>
            </View>
          ) : null}

          {showDesktopPermissionSection ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dictation behavior</Text>
              <View style={styles.audioCard}>
                <DesktopToggleRow
                  detail="Temporarily mutes other app audio during dictation and restores it when recording stops."
                  onValueChange={(nextValue) => {
                    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                    void updateSettings({
                      muteSystemAudioDuringDictation: nextValue,
                    });
                  }}
                  title="Mute system audio while recording"
                  value={settings.muteSystemAudioDuringDictation}
                />
                <DesktopToggleRow
                  detail="Automatically starts dictation when a fresh draft note opens from shortcut."
                  onValueChange={(nextValue) => {
                    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                    void updateSettings({
                      autoDictateOnNewNote: nextValue,
                    });
                  }}
                  showBorder
                  title="Auto-dictate on new note"
                  value={settings.autoDictateOnNewNote}
                />
              </View>
            </View>
          ) : null}

          {showDesktopPermissionSection ? (
            <View style={styles.section}>
              <View style={styles.permissionSectionHeader}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
                  Dictation shortcuts
                </Text>
                <Button
                  onPress={() => {
                    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                    void handleResetAllNativeHelperShortcuts();
                  }}
                  size="sm"
                  variant="secondary"
                >
                  Reset defaults
                </Button>
              </View>
              <View style={styles.audioCard}>
                {NATIVE_HELPER_SHORTCUT_ROWS.map((entry, index) => (
                  <NativeHelperShortcutRow
                    detail={entry.detail}
                    isDisabled={
                      !(
                        desktopPermissionClient &&
                        isDesktopPermissionClientConnected
                      )
                    }
                    key={entry.kind}
                    onEdit={() => openNativeHelperShortcutEditor(entry.kind)}
                    showBorder={index > 0}
                    title={entry.title}
                    value={formatNativeHelperShortcut(
                      getShortcutKeyCodes(
                        settings.nativeHelperShortcuts,
                        entry.kind
                      )
                    )}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.audioCard}>
              <View style={styles.audioRow}>
                <View style={styles.audioRowContent}>
                  <Text style={styles.audioRowTitle}>Version</Text>
                </View>
                <Text style={styles.aboutValue}>
                  {appVersion ?? "Unavailable"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

interface HostDetailModalProps {
  visible: boolean;
  host: HostProfile | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (label: string) => void;
  onRemoveConnection: (serverId: string, connectionId: string) => Promise<void>;
  onRemoveHost: (host: HostProfile) => void;
  onAddConnection: () => void;
  restartConfirmationMessage: string;
  waitForCondition: (
    predicate: () => boolean,
    timeoutMs: number,
    intervalMs?: number
  ) => Promise<boolean>;
  isScreenMountedRef: MutableRefObject<boolean>;
}

function HostDetailModal({
  visible,
  host,
  isSaving,
  onClose,
  onSave,
  onRemoveConnection,
  onRemoveHost,
  onAddConnection,
  restartConfirmationMessage,
  waitForCondition,
  isScreenMountedRef,
}: HostDetailModalProps) {
  const { theme } = useUnistyles();
  const [draftLabel, setDraftLabel] = useState("");
  const [pendingRemoveConnection, setPendingRemoveConnection] = useState<{
    serverId: string;
    connectionId: string;
    title: string;
  } | null>(null);
  const [isRemovingConnection, setIsRemovingConnection] = useState(false);

  // Read per-connection probes from host runtime snapshots.
  const _connections = host?.connections ?? [];

  // Restart logic (moved from DaemonCard)
  const {
    snapshot: runtimeSnapshot,
    client: runtimeClient,
    isConnected,
  } = useHostRuntimeSession(host?.serverId ?? "");
  const runtime = getHostRuntimeStore();
  const daemonClient = runtimeClient;
  const daemonVersion = useSessionStore((state) =>
    host ? (state.sessions[host.serverId]?.serverInfo?.version ?? null) : null
  );
  const probeByConnectionId = runtimeSnapshot?.probeByConnectionId ?? new Map();
  const connectionStatus = runtimeSnapshot?.connectionStatus ?? "connecting";
  const activeConnection = runtimeSnapshot?.activeConnection ?? null;
  const lastError = runtimeSnapshot?.lastError ?? null;
  const [isRestarting, setIsRestarting] = useState(false);
  const isHostConnected = useCallback(() => {
    if (!host) {
      return false;
    }
    return isHostRuntimeConnected(runtime.getSnapshot(host.serverId));
  }, [host, runtime]);

  const waitForDaemonRestart = useCallback(async () => {
    const disconnectTimeoutMs = 7000;
    const reconnectTimeoutMs = 30_000;

    if (isHostConnected()) {
      await waitForCondition(() => !isHostConnected(), disconnectTimeoutMs);
    }

    const reconnected = await waitForCondition(
      () => isHostConnected(),
      reconnectTimeoutMs
    );

    if (isScreenMountedRef.current) {
      setIsRestarting(false);
      if (!reconnected && host) {
        Alert.alert(
          "Unable to reconnect",
          `${host.label} did not come back online. Please verify it restarted.`
        );
      }
    }
  }, [host, isHostConnected, isScreenMountedRef, waitForCondition]);

  const beginServerRestart = useCallback(() => {
    if (!(daemonClient && host)) {
      return;
    }

    if (!isHostConnected()) {
      Alert.alert(
        "Host offline",
        "This host is offline. OpenBeam reconnects automatically—wait until it's back online before restarting."
      );
      return;
    }

    setIsRestarting(true);
    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void daemonClient
      .restartServer(`settings_daemon_restart_${host.serverId}`)
      .catch((error) => {
        console.error(
          `[Settings] Failed to restart daemon ${host.label}`,
          error
        );
        if (!isScreenMountedRef.current) {
          return;
        }
        setIsRestarting(false);
        Alert.alert(
          "Error",
          "Failed to send the restart request. OpenBeam reconnects automatically—try again once the host shows as online."
        );
      });

    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void waitForDaemonRestart();
  }, [
    daemonClient,
    host,
    isHostConnected,
    isScreenMountedRef,
    waitForDaemonRestart,
  ]);

  const handleRestartPress = useCallback(() => {
    if (!(daemonClient && host)) {
      Alert.alert(
        "Host unavailable",
        "This host is not connected. Wait for it to come online before restarting."
      );
      return;
    }

    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void confirmDialog({
      title: `Restart ${host.label}`,
      message: restartConfirmationMessage,
      confirmLabel: "Restart",
      cancelLabel: "Cancel",
      destructive: true,
    })
      .then((confirmed) => {
        if (!confirmed) {
          return;
        }
        beginServerRestart();
      })
      .catch((error) => {
        console.error(
          `[Settings] Failed to open restart confirmation for ${host.label}`,
          error
        );
        Alert.alert("Error", "Unable to open the restart confirmation dialog.");
      });
  }, [beginServerRestart, daemonClient, host, restartConfirmationMessage]);

  // Status display
  const statusLabel = formatConnectionStatus(connectionStatus);
  const statusTone = getConnectionStatusTone(connectionStatus);
  const statusColor =
    statusTone === "success"
      ? theme.colors.palette.green[400]
      : // biome-ignore lint/style/noNestedTernary: readable inline conditional
        statusTone === "warning"
        ? theme.colors.palette.amber[500]
        : // biome-ignore lint/style/noNestedTernary: readable inline conditional
          statusTone === "error"
          ? theme.colors.destructive
          : theme.colors.foregroundMuted;
  const statusPillBg =
    statusTone === "success"
      ? "rgba(74, 222, 128, 0.1)"
      : // biome-ignore lint/style/noNestedTernary: readable inline conditional
        statusTone === "warning"
        ? "rgba(245, 158, 11, 0.1)"
        : // biome-ignore lint/style/noNestedTernary: readable inline conditional
          statusTone === "error"
          ? "rgba(248, 113, 113, 0.1)"
          : "rgba(161, 161, 170, 0.1)";
  const connectionBadge = (() => {
    if (!activeConnection) {
      return null;
    }
    if (activeConnection.type === "relay") {
      return {
        icon: (
          <Globe
            color={theme.colors.foregroundMuted}
            size={theme.iconSize.xs}
          />
        ),
        text: "Relay",
      };
    }
    return {
      icon: (
        <Monitor
          color={theme.colors.foregroundMuted}
          size={theme.iconSize.xs}
        />
      ),
      text: activeConnection.display,
    };
  })();
  const versionBadgeText = formatDaemonVersionBadge(daemonVersion);
  const connectionError =
    typeof lastError === "string" && lastError.trim().length > 0
      ? lastError.trim()
      : null;

  const handleDraftLabelChange = useCallback((nextValue: string) => {
    setDraftLabel(nextValue);
  }, []);

  useEffect(() => {
    if (!(visible && host)) {
      return;
    }
    // Initialize once per modal open / host switch; keep user edits fully local while typing.
    setDraftLabel(host.label ?? "");
  }, [visible, host?.serverId, host]);

  useEffect(() => {
    if (!visible) {
      setIsRestarting(false);
      setDraftLabel("");
    }
  }, [visible]);

  return (
    <>
      <AdaptiveModalSheet
        onClose={onClose}
        testID="host-detail-modal"
        title={host?.label ?? "Host"}
        visible={visible}
      >
        {/* Status row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing[2],
          }}
        >
          <View style={[styles.statusPill, { backgroundColor: statusPillBg }]}>
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
          {connectionBadge ? (
            <View style={styles.connectionPill}>
              {connectionBadge.icon}
              <Text numberOfLines={1} style={styles.connectionText}>
                {connectionBadge.text}
              </Text>
            </View>
          ) : null}
          {versionBadgeText ? (
            <View style={styles.versionPill}>
              <Text numberOfLines={1} style={styles.connectionText}>
                {versionBadgeText}
              </Text>
            </View>
          ) : null}
        </View>
        {connectionError ? (
          <Text
            style={{
              color: theme.colors.palette.red[300],
              fontSize: theme.fontSize.xs,
            }}
          >
            {connectionError}
          </Text>
        ) : null}

        {/* Label */}
        <View style={styles.formField}>
          <Text style={styles.label}>Label</Text>
          <AdaptiveTextInput
            onChangeText={handleDraftLabelChange}
            placeholder="My Host"
            placeholderTextColor={theme.colors.foregroundMuted}
            style={styles.input}
            value={draftLabel}
          />
        </View>

        {/* Connections */}
        {host ? (
          <View style={styles.formField}>
            <Text style={styles.label}>Connections</Text>
            <View style={{ gap: 8 }}>
              {host.connections.map((conn) => {
                const probe = probeByConnectionId.get(conn.id);
                return (
                  <ConnectionRow
                    connection={conn}
                    key={conn.id}
                    latencyError={probe?.status === "unavailable"}
                    latencyLoading={!probe || probe.status === "pending"}
                    latencyMs={
                      probe?.status === "available"
                        ? probe.latencyMs
                        : undefined
                    }
                    onRemove={() => {
                      const title =
                        conn.type === "relay"
                          ? `Relay (${conn.relayEndpoint})`
                          : `Direct (${conn.endpoint})`;
                      setPendingRemoveConnection({
                        serverId: host.serverId,
                        connectionId: conn.id,
                        title,
                      });
                    }}
                  />
                );
              })}
              <Pressable onPress={onAddConnection} style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Add connection</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Save/Cancel + Advanced */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            marginTop: theme.spacing[2],
            paddingTop: theme.spacing[4],
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger
                style={({ pressed }) => [
                  styles.advancedTrigger,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Settings
                  color={theme.colors.foregroundMuted}
                  size={theme.iconSize.sm}
                />
                <Text style={styles.advancedTriggerText}>Advanced</Text>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" width={220}>
                <DropdownMenuItem
                  disabled={!(daemonClient && isConnected)}
                  leading={
                    <RotateCw
                      color={theme.colors.foregroundMuted}
                      size={theme.iconSize.md}
                    />
                  }
                  onSelect={handleRestartPress}
                  pendingLabel="Restarting..."
                  status={isRestarting ? "pending" : "idle"}
                >
                  Restart daemon
                </DropdownMenuItem>
                <DropdownMenuItem
                  leading={
                    <Trash2
                      color={theme.colors.destructive}
                      size={theme.iconSize.md}
                    />
                  }
                  onSelect={() => {
                    if (host) {
                      onRemoveHost(host);
                    }
                  }}
                >
                  Remove host
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <View style={styles.formActionsRow}>
              <Button
                disabled={isSaving}
                onPress={onClose}
                size="sm"
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                disabled={isSaving}
                onPress={() => onSave(draftLabel)}
                size="sm"
                variant="default"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </View>
          </View>
        </View>
      </AdaptiveModalSheet>

      {/* Remove connection confirmation */}
      {pendingRemoveConnection ? (
        <AdaptiveModalSheet
          onClose={() => {
            if (isRemovingConnection) {
              return;
            }
            setPendingRemoveConnection(null);
          }}
          testID="remove-connection-confirm-modal"
          title="Remove connection"
          visible
        >
          <Text style={{ color: theme.colors.foregroundMuted, fontSize: 14 }}>
            Remove {pendingRemoveConnection.title}? This cannot be undone.
          </Text>
          <View
            style={[styles.formActionsRow, { marginTop: theme.spacing[4] }]}
          >
            <Button
              disabled={isRemovingConnection}
              onPress={() => setPendingRemoveConnection(null)}
              size="sm"
              style={{ flex: 1 }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              disabled={isRemovingConnection}
              onPress={() => {
                const { serverId, connectionId } = pendingRemoveConnection;
                setIsRemovingConnection(true);
                // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                void onRemoveConnection(serverId, connectionId)
                  .then(() => setPendingRemoveConnection(null))
                  .catch((error) => {
                    console.error(
                      "[Settings] Failed to remove connection",
                      error
                    );
                    Alert.alert("Error", "Unable to remove connection");
                  })
                  .finally(() => setIsRemovingConnection(false));
              }}
              size="sm"
              style={{ flex: 1 }}
              testID="remove-connection-confirm"
              variant="destructive"
            >
              Remove
            </Button>
          </View>
        </AdaptiveModalSheet>
      ) : null}
    </>
  );
}

interface DesktopPermissionRowProps {
  title: string;
  status: DesktopPermissionStatus | null;
  isRequesting: boolean;
  showBorder?: boolean;
  onRequest: () => void;
}

function DesktopPermissionRow({
  title,
  status,
  isRequesting,
  showBorder,
  onRequest,
}: DesktopPermissionRowProps) {
  const { theme } = useUnistyles();
  const state = status?.state ?? "unknown";
  const isGranted = state === "granted";
  const shouldShowDetail =
    status !== null &&
    status.detail.trim().length > 0 &&
    state !== "granted" &&
    state !== "prompt" &&
    state !== "not-granted";

  return (
    <View style={[styles.audioRow, showBorder && styles.audioRowBorder]}>
      <View style={styles.audioRowContent}>
        <Text style={styles.audioRowTitle}>{title}</Text>
      </View>
      <View style={styles.permissionRowActions}>
        {isGranted ? (
          <View style={styles.permissionStatusPill}>
            <Check
              color={theme.colors.foregroundMuted}
              size={theme.iconSize.sm}
            />
            <Text style={styles.permissionStatusText}>Granted</Text>
          </View>
        ) : (
          <Button
            disabled={isRequesting}
            onPress={onRequest}
            size="sm"
            variant="secondary"
          >
            {isRequesting ? "Requesting..." : "Request"}
          </Button>
        )}
        {shouldShowDetail ? (
          <Text style={styles.permissionDetailText}>{status?.detail}</Text>
        ) : null}
      </View>
    </View>
  );
}

interface DesktopToggleRowProps {
  title: string;
  detail: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  showBorder?: boolean;
}

function DesktopToggleRow({
  title,
  detail,
  value,
  onValueChange,
  showBorder,
}: DesktopToggleRowProps) {
  const { theme } = useUnistyles();

  return (
    <View style={[styles.audioRow, showBorder && styles.audioRowBorder]}>
      <View style={styles.audioRowContent}>
        <Text style={styles.audioRowTitle}>{title}</Text>
        <Text style={styles.shortcutDetailText}>{detail}</Text>
      </View>
      <Switch
        onValueChange={onValueChange}
        thumbColor={theme.colors.palette.white}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.palette.green[500],
        }}
        value={value}
      />
    </View>
  );
}

interface NativeHelperShortcutRowProps {
  title: string;
  detail: string;
  value: string;
  showBorder?: boolean;
  isDisabled?: boolean;
  onEdit: () => void;
}

function NativeHelperShortcutRow({
  title,
  detail,
  value,
  showBorder,
  isDisabled,
  onEdit,
}: NativeHelperShortcutRowProps) {
  return (
    <View style={[styles.audioRow, showBorder && styles.audioRowBorder]}>
      <View style={styles.shortcutRowContent}>
        <Text style={styles.audioRowTitle}>{title}</Text>
        <Text style={styles.shortcutDetailText}>{detail}</Text>
        <Text style={styles.shortcutValueText}>{value}</Text>
      </View>
      <Button
        disabled={isDisabled}
        onPress={onEdit}
        size="sm"
        variant="secondary"
      >
        Edit
      </Button>
    </View>
  );
}

function ConnectionRow({
  connection,
  latencyMs,
  latencyLoading,
  latencyError,
  onRemove,
}: {
  connection: HostConnection;
  latencyMs: number | null | undefined;
  latencyLoading: boolean;
  latencyError: boolean;
  onRemove: () => void;
}) {
  const { theme } = useUnistyles();
  const title =
    connection.type === "relay"
      ? `Relay (${connection.relayEndpoint})`
      : `Direct (${connection.endpoint})`;

  const latencyText = (() => {
    if (latencyLoading) {
      return "...";
    }
    if (latencyError) {
      return "Timeout";
    }
    if (latencyMs != null) {
      return `${latencyMs}ms`;
    }
    return "\u2014";
  })();

  const latencyColor = latencyError
    ? theme.colors.palette.red[300]
    : theme.colors.foregroundMuted;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface2,
      }}
    >
      <Text style={{ color: theme.colors.foreground, fontSize: 12, flex: 1 }}>
        {title}
      </Text>
      <Text style={{ color: latencyColor, fontSize: 11 }}>{latencyText}</Text>
      <Pressable onPress={onRemove}>
        <Text
          style={{
            color: theme.colors.destructive,
            fontSize: 12,
            fontWeight: "500",
          }}
        >
          Remove
        </Text>
      </Pressable>
    </View>
  );
}

interface DaemonCardProps {
  daemon: HostProfile;
  onOpenSettings: (daemon: HostProfile) => void;
}

function DaemonCard({ daemon, onOpenSettings }: DaemonCardProps) {
  const { theme } = useUnistyles();
  const { snapshot } = useHostRuntimeSession(daemon.serverId);
  const connectionStatus = snapshot?.connectionStatus ?? "connecting";
  const activeConnection = snapshot?.activeConnection ?? null;
  const lastError = snapshot?.lastError ?? null;
  const daemonVersion = useSessionStore(
    useCallback(
      (state) => state.sessions[daemon.serverId]?.serverInfo?.version ?? null,
      [daemon.serverId]
    )
  );
  const statusLabel = formatConnectionStatus(connectionStatus);
  const statusTone = getConnectionStatusTone(connectionStatus);
  const statusColor =
    statusTone === "success"
      ? theme.colors.palette.green[400]
      : // biome-ignore lint/style/noNestedTernary: readable inline conditional
        statusTone === "warning"
        ? theme.colors.palette.amber[500]
        : // biome-ignore lint/style/noNestedTernary: readable inline conditional
          statusTone === "error"
          ? theme.colors.destructive
          : theme.colors.foregroundMuted;
  const badgeText = statusLabel;
  const connectionError =
    typeof lastError === "string" && lastError.trim().length > 0
      ? lastError.trim()
      : null;
  const statusPillBg =
    statusTone === "success"
      ? "rgba(74, 222, 128, 0.1)"
      : // biome-ignore lint/style/noNestedTernary: readable inline conditional
        statusTone === "warning"
        ? "rgba(245, 158, 11, 0.1)"
        : // biome-ignore lint/style/noNestedTernary: readable inline conditional
          statusTone === "error"
          ? "rgba(248, 113, 113, 0.1)"
          : "rgba(161, 161, 170, 0.1)";
  const connectionBadge = (() => {
    if (!activeConnection) {
      return null;
    }
    if (activeConnection.type === "relay") {
      return {
        icon: (
          <Globe
            color={theme.colors.foregroundMuted}
            size={theme.iconSize.xs}
          />
        ),
        text: "Relay",
      };
    }
    return {
      icon: (
        <Monitor
          color={theme.colors.foregroundMuted}
          size={theme.iconSize.xs}
        />
      ),
      text: activeConnection.display,
    };
  })();
  const versionBadgeText = formatDaemonVersionBadge(daemonVersion);

  return (
    <View style={styles.hostCard} testID={`daemon-card-${daemon.serverId}`}>
      <View style={styles.hostCardContent}>
        <View style={styles.hostHeaderRow}>
          <Text numberOfLines={1} style={styles.hostLabel}>
            {daemon.label}
          </Text>
          <View style={styles.hostHeaderRight}>
            <View
              style={[
                Platform.OS === "web"
                  ? styles.statusPill
                  : styles.statusPillMobile,
                { backgroundColor: statusPillBg },
              ]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              {Platform.OS === "web" ? (
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {badgeText}
                </Text>
              ) : null}
            </View>

            {connectionBadge ? (
              <View
                style={
                  Platform.OS === "web"
                    ? styles.connectionPill
                    : styles.connectionPillMobile
                }
              >
                {connectionBadge.icon}
                {Platform.OS === "web" ? (
                  <Text numberOfLines={1} style={styles.connectionText}>
                    {connectionBadge.text}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {versionBadgeText ? (
              <View style={styles.versionPill}>
                <Text numberOfLines={1} style={styles.connectionText}>
                  {versionBadgeText}
                </Text>
              </View>
            ) : null}

            <Pressable
              accessibilityLabel={`Open settings for ${daemon.label}`}
              accessibilityRole="button"
              onPress={() => onOpenSettings(daemon)}
              style={({ pressed, hovered }) => [
                styles.hostSettingsButton,
                (pressed || hovered) && styles.hostSettingsButtonActive,
              ]}
              testID={`daemon-card-settings-${daemon.serverId}`}
            >
              {({ pressed, hovered }) => (
                <Settings
                  color={
                    pressed || hovered
                      ? theme.colors.foreground
                      : theme.colors.foregroundMuted
                  }
                  size={theme.iconSize.md}
                />
              )}
            </Pressable>
          </View>
        </View>
        {connectionError ? (
          <Text style={styles.hostError}>{connectionError}</Text>
        ) : null}
      </View>
    </View>
  );
}
