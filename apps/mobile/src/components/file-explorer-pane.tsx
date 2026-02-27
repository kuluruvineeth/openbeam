import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import {
  Copy,
  Download,
  File,
  FileText,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  MoreVertical,
  RotateCw,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  Image as RNImage,
  ScrollView as RNScrollView,
  Text,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  ScrollView,
} from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import {
  StyleSheet,
  UnistylesRuntime,
  useUnistyles,
} from "react-native-unistyles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useWebDesktopScrollbarMetrics,
  WebDesktopScrollbarOverlay,
} from "@/components/web-desktop-scrollbar";
import { Fonts } from "@/constants/theme";
import { useDaemonConnections } from "@/contexts/daemon-connections-context";
import { useFileExplorerActions } from "@/hooks/use-file-explorer-actions";
import { useDownloadStore } from "@/stores/download-store";
import {
  DEFAULT_EXPLORER_FILES_SPLIT_RATIO,
  type SortOption,
  usePanelStore,
} from "@/stores/panel-store";
import type {
  AgentFileExplorerState,
  ExplorerEntry,
  ExplorerFile,
} from "@/stores/session-store";
import { useSessionStore } from "@/stores/session-store";
import { formatTimeAgo } from "@/utils/time";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "modified", label: "Modified" },
  { value: "size", label: "Size" },
];

const INDENT_PER_LEVEL = 12;

interface FileExplorerPaneProps {
  serverId: string;
  agentId: string;
}

interface TreeRow {
  entry: ExplorerEntry;
  depth: number;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: necessary for this context
export function FileExplorerPane({ serverId, agentId }: FileExplorerPaneProps) {
  const { theme } = useUnistyles();
  const isMobile =
    UnistylesRuntime.breakpoint === "xs" ||
    UnistylesRuntime.breakpoint === "sm";
  const showDesktopWebScrollbar = Platform.OS === "web" && !isMobile;

  const { connectionStates } = useDaemonConnections();
  const daemonProfile = connectionStates.get(serverId)?.daemon;
  const agentExists = useSessionStore((state) =>
    agentId && state.sessions[serverId]
      ? state.sessions[serverId]?.agents.has(agentId)
      : false
  );
  const explorerState = useSessionStore((state) =>
    agentId && state.sessions[serverId]
      ? state.sessions[serverId]?.fileExplorer.get(agentId)
      : undefined
  );

  const {
    requestDirectoryListing,
    requestFilePreview,
    requestFileDownloadToken,
    selectExplorerEntry,
  } = useFileExplorerActions(serverId);
  const sortOption = usePanelStore((state) => state.explorerSortOption);
  const setSortOption = usePanelStore((state) => state.setExplorerSortOption);
  const splitRatio = usePanelStore((state) => state.explorerFilesSplitRatio);
  const setSplitRatio = usePanelStore(
    (state) => state.setExplorerFilesSplitRatio
  );

  const directories = explorerState?.directories ?? new Map();
  const files = explorerState?.files ?? new Map();
  const pendingRequest = explorerState?.pendingRequest ?? null;
  const isExplorerLoading = explorerState?.isLoading ?? false;
  const error = explorerState?.lastError ?? null;
  const selectedEntryPath = explorerState?.selectedEntryPath ?? null;

  const preview = selectedEntryPath ? files.get(selectedEntryPath) : null;
  const isPreviewLoading = Boolean(
    isExplorerLoading &&
      pendingRequest?.mode === "file" &&
      pendingRequest?.path === selectedEntryPath
  );

  const isDirectoryLoading = useCallback(
    (path: string) =>
      Boolean(
        isExplorerLoading &&
          pendingRequest?.mode === "list" &&
          pendingRequest?.path === path
      ),
    [isExplorerLoading, pendingRequest?.mode, pendingRequest?.path]
  );

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(["."])
  );
  const [containerWidth, setContainerWidth] = useState(0);
  const wasInlinePreviewVisibleRef = useRef(false);
  const treeListRef = useRef<FlatList<TreeRow>>(null);
  const treeScrollbarMetrics = useWebDesktopScrollbarMetrics();

  // Bottom sheet for file preview (mobile)
  const previewSheetRef = useRef<BottomSheetModal>(null);
  const previewSnapPoints = useMemo(() => ["70%", "95%"], []);

  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!(agentId && requestDirectoryListing)) {
      return;
    }
    if (hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;
    requestDirectoryListing(agentId, ".", {
      recordHistory: false,
      setCurrentPath: false,
    });
  }, [agentId, requestDirectoryListing]);

  // Expand ancestor directories when a file is selected (e.g., from an inline path click)
  useEffect(() => {
    if (!(agentId && selectedEntryPath && requestDirectoryListing)) {
      return;
    }
    const parentDir = getParentDirectory(selectedEntryPath);
    const ancestors = getAncestorDirectories(parentDir);

    setExpandedPaths((prev) => {
      const next = new Set(prev);
      // biome-ignore lint/suspicious/useIterableCallbackReturn: necessary for this context
      // biome-ignore lint/complexity/noForEach: forEach is idiomatic here
      ancestors.forEach((path) => next.add(path));
      return next;
    });

    // biome-ignore lint/complexity/noForEach: forEach is idiomatic here
    ancestors.forEach((path) => {
      if (!directories.has(path)) {
        requestDirectoryListing(agentId, path, {
          recordHistory: false,
          setCurrentPath: false,
        });
      }
    });
  }, [agentId, directories, requestDirectoryListing, selectedEntryPath]);

  // Open/close preview sheet based on selection
  useEffect(() => {
    if (!isMobile) {
      return;
    }
    if (selectedEntryPath) {
      previewSheetRef.current?.present();
    } else {
      previewSheetRef.current?.dismiss();
    }
  }, [isMobile, selectedEntryPath]);

  const handleClosePreview = useCallback(() => {
    if (!agentId) {
      return;
    }
    selectExplorerEntry(agentId, null);
  }, [agentId, selectExplorerEntry]);

  const handleToggleDirectory = useCallback(
    (entry: ExplorerEntry) => {
      if (!(agentId && requestDirectoryListing)) {
        return;
      }

      const isExpanded = expandedPaths.has(entry.path);
      const nextExpanded = !isExpanded;
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        if (isExpanded) {
          next.delete(entry.path);
        } else {
          next.add(entry.path);
        }
        return next;
      });

      if (nextExpanded && !directories.has(entry.path)) {
        requestDirectoryListing(agentId, entry.path, {
          recordHistory: false,
          setCurrentPath: false,
        });
      }
    },
    [agentId, directories, expandedPaths, requestDirectoryListing]
  );

  const handleOpenFile = useCallback(
    (entry: ExplorerEntry) => {
      if (!(agentId && requestFilePreview)) {
        return;
      }
      selectExplorerEntry(agentId, entry.path);
      requestFilePreview(agentId, entry.path);
    },
    [agentId, requestFilePreview, selectExplorerEntry]
  );

  const handleEntryPress = useCallback(
    (entry: ExplorerEntry) => {
      if (entry.kind === "directory") {
        handleToggleDirectory(entry);
        return;
      }
      handleOpenFile(entry);
    },
    [handleOpenFile, handleToggleDirectory]
  );

  const handleCopyPath = useCallback(async (path: string) => {
    await Clipboard.setStringAsync(path);
  }, []);

  const startDownload = useDownloadStore((state) => state.startDownload);
  const handleDownloadEntry = useCallback(
    (entry: ExplorerEntry) => {
      if (!(agentId && requestFileDownloadToken) || entry.kind !== "file") {
        return;
      }

      startDownload({
        serverId,
        agentId,
        fileName: entry.name,
        path: entry.path,
        daemonProfile,
        requestFileDownloadToken,
      });
    },
    [agentId, serverId, daemonProfile, requestFileDownloadToken, startDownload]
  );

  const handleSortCycle = useCallback(() => {
    const currentIndex = SORT_OPTIONS.findIndex(
      (opt) => opt.value === sortOption
    );
    const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length;
    setSortOption(SORT_OPTIONS[nextIndex].value);
  }, [sortOption, setSortOption]);

  const { refetch: refetchExplorer, isFetching: isRefreshFetching } = useQuery({
    queryKey: ["fileExplorerRefresh", serverId, agentId],
    queryFn: async () => {
      if (!agentId) {
        return null;
      }

      const directoryPaths = Array.from(expandedPaths);
      if (!directoryPaths.includes(".")) {
        directoryPaths.unshift(".");
      }

      await Promise.all([
        ...directoryPaths.map((path) =>
          requestDirectoryListing(agentId, path, {
            recordHistory: false,
            setCurrentPath: false,
          })
        ),
        ...(selectedEntryPath
          ? [requestFilePreview(agentId, selectedEntryPath)]
          : []),
      ]);
      return null;
    },
    enabled: false,
  });

  const handleRefresh = useCallback(() => {
    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void refetchExplorer();
  }, [refetchExplorer]);
  const refreshIconRotation = useSharedValue(0);

  useEffect(() => {
    if (isRefreshFetching) {
      refreshIconRotation.value = 0;
      refreshIconRotation.value = withRepeat(
        withTiming(360, {
          duration: 700,
          easing: Easing.linear,
        }),
        -1,
        false
      );
      return;
    }

    cancelAnimation(refreshIconRotation);
    const remainder = refreshIconRotation.value % 360;
    if (Math.abs(remainder) < 0.001) {
      refreshIconRotation.value = 0;
      return;
    }

    const remaining = 360 - remainder;
    const duration = Math.max(80, Math.round((remaining / 360) * 700));
    refreshIconRotation.value = withTiming(
      360,
      {
        duration,
        easing: Easing.linear,
      },
      (finished) => {
        if (finished) {
          refreshIconRotation.value = 0;
        }
      }
    );
  }, [isRefreshFetching, refreshIconRotation]);

  const refreshIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${refreshIconRotation.value}deg` }],
  }));

  const currentSortLabel =
    SORT_OPTIONS.find((opt) => opt.value === sortOption)?.label ?? "Name";

  const treeRows = useMemo(() => {
    const rootDirectory = directories.get(".");
    if (!rootDirectory) {
      return [];
    }
    return buildTreeRows({
      directories,
      expandedPaths,
      sortOption,
      path: ".",
      depth: 0,
    });
  }, [directories, expandedPaths, sortOption]);

  const showInitialLoading =
    !directories.has(".") &&
    Boolean(
      isExplorerLoading &&
        pendingRequest?.mode === "list" &&
        pendingRequest?.path === "."
    );
  const showBackFromError = Boolean(error && selectedEntryPath);
  const errorRecoveryPath = useMemo(
    () => getErrorRecoveryPath(explorerState),
    [explorerState]
  );

  const shouldShowInlinePreview = !isMobile && Boolean(selectedEntryPath);
  const minTreeWidth = 220;
  const minPreviewWidth = 320;

  const safeSplitRatio = Number.isFinite(splitRatio)
    ? splitRatio
    : DEFAULT_EXPLORER_FILES_SPLIT_RATIO;

  const splitAvailableWidth = useSharedValue(0);
  const splitMaxTreeWidth = useSharedValue(minTreeWidth);
  const splitTreeWidth = useSharedValue(minTreeWidth);
  const splitStartTreeWidth = useSharedValue(minTreeWidth);

  useEffect(() => {
    if (!shouldShowInlinePreview) {
      wasInlinePreviewVisibleRef.current = false;
      return;
    }
    if (containerWidth <= 0) {
      return;
    }

    const available = Math.max(0, containerWidth);
    const maxTree = Math.max(minTreeWidth, available - minPreviewWidth);
    const isOpeningInlinePreview = !wasInlinePreviewVisibleRef.current;
    const desired = isOpeningInlinePreview
      ? Math.round(available * safeSplitRatio)
      : splitTreeWidth.value;
    const clamped = Math.max(minTreeWidth, Math.min(maxTree, desired));

    splitAvailableWidth.value = available;
    splitMaxTreeWidth.value = maxTree;
    splitTreeWidth.value = clamped;
    wasInlinePreviewVisibleRef.current = true;
  }, [
    containerWidth,
    safeSplitRatio,
    shouldShowInlinePreview,
    splitAvailableWidth,
    splitMaxTreeWidth,
    splitTreeWidth,
  ]);

  const treePaneAnimatedStyle = useAnimatedStyle(() => ({
    width: splitTreeWidth.value,
    flexBasis: splitTreeWidth.value,
    flexGrow: 0,
    flexShrink: 0,
  }));

  const splitResizeGesture = useMemo(() => {
    if (isMobile || !shouldShowInlinePreview) {
      return Gesture.Pan().enabled(false);
    }

    return Gesture.Pan()
      .hitSlop({ left: 12, right: 12, top: 0, bottom: 0 })
      .onStart(() => {
        splitStartTreeWidth.value = splitTreeWidth.value;
      })
      .onUpdate((event) => {
        const nextWidth = splitStartTreeWidth.value - event.translationX;
        const clamped = Math.max(
          minTreeWidth,
          Math.min(splitMaxTreeWidth.value, nextWidth)
        );
        splitTreeWidth.value = clamped;
      })
      .onEnd(() => {
        const available = splitAvailableWidth.value;
        const ratio =
          available > 0 ? splitTreeWidth.value / available : safeSplitRatio;
        runOnJS(setSplitRatio)(ratio);
      });
  }, [
    isMobile,
    safeSplitRatio,
    setSplitRatio,
    shouldShowInlinePreview,
    splitAvailableWidth,
    splitMaxTreeWidth,
    splitStartTreeWidth,
    splitTreeWidth,
  ]);

  const renderTreeRow = useCallback(
    ({ item }: ListRenderItemInfo<TreeRow>) => {
      const entry = item.entry;
      const depth = item.depth;
      const displayKind = getEntryDisplayKind(entry);
      const isDirectory = entry.kind === "directory";
      const isExpanded = isDirectory && expandedPaths.has(entry.path);
      const isSelected = selectedEntryPath === entry.path;
      const loading = isDirectory && isDirectoryLoading(entry.path);

      return (
        <Pressable
          onPress={() => handleEntryPress(entry)}
          style={({ hovered, pressed }) => [
            styles.entryRow,
            { paddingLeft: theme.spacing[2] + depth * INDENT_PER_LEVEL },
            (hovered || pressed || isSelected) && styles.entryRowActive,
          ]}
        >
          <View style={styles.entryInfo}>
            <View style={styles.entryIcon}>
              {loading ? (
                <ActivityIndicator size="small" />
              ) : (
                renderEntryIcon(isDirectory ? "directory" : displayKind, {
                  foreground: theme.colors.foregroundMuted,
                  primary: theme.colors.primary,
                  directoryOpen: isExpanded,
                })
              )}
            </View>
            <Text numberOfLines={1} style={styles.entryName}>
              {entry.name}
            </Text>
          </View>
          <DropdownMenu>
            <DropdownMenuTrigger
              hitSlop={8}
              onPressIn={(event) => event.stopPropagation?.()}
              style={({ hovered, pressed, open }) => [
                styles.menuButton,
                (hovered || pressed || open) && styles.menuButtonActive,
              ]}
            >
              <MoreVertical color={theme.colors.foregroundMuted} size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" width={220}>
              <View style={styles.contextMetaBlock}>
                <View style={styles.contextMetaRow}>
                  <Text numberOfLines={1} style={styles.contextMetaLabel}>
                    Size
                  </Text>
                  <Text
                    ellipsizeMode="tail"
                    numberOfLines={1}
                    style={styles.contextMetaValue}
                  >
                    {formatFileSize({ size: entry.size })}
                  </Text>
                </View>
                <View style={styles.contextMetaRow}>
                  <Text numberOfLines={1} style={styles.contextMetaLabel}>
                    Modified
                  </Text>
                  <Text
                    ellipsizeMode="tail"
                    numberOfLines={1}
                    style={styles.contextMetaValue}
                  >
                    {formatTimeAgo(new Date(entry.modifiedAt))}
                  </Text>
                </View>
              </View>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                leading={
                  <Copy color={theme.colors.foregroundMuted} size={14} />
                }
                onSelect={() => {
                  // biome-ignore lint/complexity/noVoid: fire-and-forget async call
                  void handleCopyPath(entry.path);
                }}
              >
                Copy path
              </DropdownMenuItem>
              {entry.kind === "file" ? (
                <DropdownMenuItem
                  leading={
                    <Download color={theme.colors.foregroundMuted} size={14} />
                  }
                  onSelect={() => handleDownloadEntry(entry)}
                >
                  Download
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </Pressable>
      );
    },
    [
      expandedPaths,
      handleEntryPress,
      handleCopyPath,
      handleDownloadEntry,
      isDirectoryLoading,
      selectedEntryPath,
      theme.colors,
      theme.spacing,
    ]
  );

  const handlePreviewSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        handleClosePreview();
      }
    },
    [handleClosePreview]
  );

  const renderPreviewBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
      />
    ),
    []
  );

  const handleBackFromError = useCallback(() => {
    if (!(agentId && requestDirectoryListing)) {
      return;
    }
    selectExplorerEntry(agentId, null);
    requestDirectoryListing(agentId, errorRecoveryPath, {
      recordHistory: false,
      setCurrentPath: true,
    });
  }, [
    agentId,
    errorRecoveryPath,
    requestDirectoryListing,
    selectExplorerEntry,
  ]);

  if (!agentExists) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorText}>Agent not found</Text>
      </View>
    );
  }

  // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook is intentional
  const handleTreeListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (showDesktopWebScrollbar) {
        treeScrollbarMetrics.onScroll(event);
      }
    },
    [showDesktopWebScrollbar, treeScrollbarMetrics]
  );

  // biome-ignore lint/correctness/useHookAtTopLevel: conditional hook is intentional
  const handleTreeListLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (showDesktopWebScrollbar) {
        treeScrollbarMetrics.onLayout(event);
      }
    },
    [showDesktopWebScrollbar, treeScrollbarMetrics]
  );

  return (
    <View
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      style={styles.container}
    >
      {error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.errorActions}>
            {showBackFromError ? (
              <Pressable
                onPress={handleBackFromError}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Back</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                if (agentId) {
                  requestDirectoryListing(agentId, ".", {
                    recordHistory: false,
                    setCurrentPath: false,
                  });
                }
              }}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        </View>
        // biome-ignore lint/style/noNestedTernary: readable inline conditional
      ) : showInitialLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>Loading files…</Text>
        </View>
        // biome-ignore lint/style/noNestedTernary: readable inline conditional
      ) : treeRows.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.emptyText}>No files</Text>
        </View>
      ) : (
        <View style={styles.desktopSplit}>
          {shouldShowInlinePreview ? (
            <View style={styles.previewPane}>
              <View style={styles.paneHeader} testID="preview-pane-header">
                <Text numberOfLines={1} style={styles.previewHeaderText}>
                  {selectedEntryPath?.split("/").pop() ?? "Preview"}
                </Text>
                <View style={styles.previewHeaderRight}>
                  {isPreviewLoading ? (
                    <ActivityIndicator
                      color={theme.colors.foregroundMuted}
                      size="small"
                    />
                  ) : null}
                  <Pressable
                    accessibilityLabel="Close preview"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={handleClosePreview}
                    style={({ hovered, pressed }) => [
                      styles.iconButton,
                      (hovered || pressed) && styles.iconButtonHovered,
                    ]}
                  >
                    <X color={theme.colors.foregroundMuted} size={16} />
                  </Pressable>
                </View>
              </View>

              <FilePreviewBody
                isLoading={isPreviewLoading}
                preview={preview}
                showDesktopWebScrollbar={showDesktopWebScrollbar}
                variant="inline"
              />
            </View>
          ) : null}

          {shouldShowInlinePreview ? (
            <Animated.View
              style={[
                styles.treePane,
                styles.treePaneWithPreview,
                { minWidth: minTreeWidth },
                treePaneAnimatedStyle,
              ]}
            >
              <GestureDetector gesture={splitResizeGesture}>
                <View
                  style={[
                    styles.splitResizeHandle,
                    // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
                    Platform.OS === "web" && ({ cursor: "col-resize" } as any),
                    Platform.OS === "web" &&
                      // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
                      ({ touchAction: "none", userSelect: "none" } as any),
                  ]}
                />
              </GestureDetector>
              <View style={styles.paneHeader} testID="files-pane-header">
                <View style={styles.paneHeaderLeft} />
                <View style={styles.paneHeaderRight}>
                  <Pressable
                    accessibilityLabel="Refresh files"
                    accessibilityRole="button"
                    disabled={isRefreshFetching}
                    hitSlop={8}
                    onPress={handleRefresh}
                    style={({ hovered, pressed }) => [
                      styles.iconButton,
                      (hovered || pressed) && styles.iconButtonHovered,
                      pressed && styles.iconButtonPressed,
                    ]}
                  >
                    <Animated.View
                      style={[styles.refreshIcon, refreshIconAnimatedStyle]}
                    >
                      <RotateCw
                        color={theme.colors.foregroundMuted}
                        size={16}
                      />
                    </Animated.View>
                  </Pressable>
                  <Pressable
                    onPress={handleSortCycle}
                    style={styles.sortButton}
                  >
                    <Text style={styles.sortButtonText}>
                      {currentSortLabel}
                    </Text>
                  </Pressable>
                </View>
              </View>
              <FlatList
                contentContainerStyle={styles.entriesContent}
                data={treeRows}
                initialNumToRender={24}
                keyExtractor={(row) => row.entry.path}
                maxToRenderPerBatch={40}
                onContentSizeChange={
                  showDesktopWebScrollbar
                    ? treeScrollbarMetrics.onContentSizeChange
                    : undefined
                }
                onLayout={
                  showDesktopWebScrollbar ? handleTreeListLayout : undefined
                }
                onScroll={
                  showDesktopWebScrollbar ? handleTreeListScroll : undefined
                }
                ref={treeListRef}
                renderItem={renderTreeRow}
                scrollEventThrottle={showDesktopWebScrollbar ? 16 : undefined}
                showsVerticalScrollIndicator={!showDesktopWebScrollbar}
                style={styles.treeList}
                testID="file-explorer-tree-scroll"
                windowSize={12}
              />
              <WebDesktopScrollbarOverlay
                enabled={showDesktopWebScrollbar}
                metrics={treeScrollbarMetrics}
                onScrollToOffset={(nextOffset) => {
                  treeListRef.current?.scrollToOffset({
                    offset: nextOffset,
                    animated: false,
                  });
                }}
              />
            </Animated.View>
          ) : (
            <View style={[styles.treePane, styles.treePaneFill]}>
              <View style={styles.paneHeader} testID="files-pane-header">
                <View style={styles.paneHeaderLeft} />
                <View style={styles.paneHeaderRight}>
                  <Pressable
                    accessibilityLabel="Refresh files"
                    accessibilityRole="button"
                    disabled={isRefreshFetching}
                    hitSlop={8}
                    onPress={handleRefresh}
                    style={({ hovered, pressed }) => [
                      styles.iconButton,
                      (hovered || pressed) && styles.iconButtonHovered,
                      pressed && styles.iconButtonPressed,
                    ]}
                  >
                    <Animated.View
                      style={[styles.refreshIcon, refreshIconAnimatedStyle]}
                    >
                      <RotateCw
                        color={theme.colors.foregroundMuted}
                        size={16}
                      />
                    </Animated.View>
                  </Pressable>
                  <Pressable
                    onPress={handleSortCycle}
                    style={styles.sortButton}
                  >
                    <Text style={styles.sortButtonText}>
                      {currentSortLabel}
                    </Text>
                  </Pressable>
                </View>
              </View>
              <FlatList
                contentContainerStyle={styles.entriesContent}
                data={treeRows}
                initialNumToRender={24}
                keyExtractor={(row) => row.entry.path}
                maxToRenderPerBatch={40}
                onContentSizeChange={
                  showDesktopWebScrollbar
                    ? treeScrollbarMetrics.onContentSizeChange
                    : undefined
                }
                onLayout={
                  showDesktopWebScrollbar ? handleTreeListLayout : undefined
                }
                onScroll={
                  showDesktopWebScrollbar ? handleTreeListScroll : undefined
                }
                ref={treeListRef}
                renderItem={renderTreeRow}
                scrollEventThrottle={showDesktopWebScrollbar ? 16 : undefined}
                showsVerticalScrollIndicator={!showDesktopWebScrollbar}
                style={styles.treeList}
                testID="file-explorer-tree-scroll"
                windowSize={12}
              />
              <WebDesktopScrollbarOverlay
                enabled={showDesktopWebScrollbar}
                metrics={treeScrollbarMetrics}
                onScrollToOffset={(nextOffset) => {
                  treeListRef.current?.scrollToOffset({
                    offset: nextOffset,
                    animated: false,
                  });
                }}
              />
            </View>
          )}
        </View>
      )}

      {isMobile ? (
        <BottomSheetModal
          backdropComponent={renderPreviewBackdrop}
          backgroundStyle={styles.sheetBackground}
          enableDynamicSizing={false}
          enablePanDownToClose
          handleIndicatorStyle={styles.handleIndicator}
          index={0}
          onChange={handlePreviewSheetChange}
          ref={previewSheetRef}
          snapPoints={previewSnapPoints}
        >
          <View style={styles.sheetHeader}>
            <Text numberOfLines={1} style={styles.sheetTitle}>
              {selectedEntryPath?.split("/").pop() ?? "Preview"}
            </Text>
            <Pressable
              onPress={handleClosePreview}
              style={styles.sheetCloseButton}
            >
              <X color={theme.colors.foregroundMuted} size={20} />
            </Pressable>
          </View>
          <FilePreviewBody
            isLoading={isPreviewLoading}
            preview={preview}
            showDesktopWebScrollbar={false}
            variant="sheet"
          />
        </BottomSheetModal>
      ) : null}
    </View>
  );
}

function FilePreviewBody({
  preview,
  isLoading,
  variant,
  showDesktopWebScrollbar,
}: {
  preview: ExplorerFile | null;
  isLoading: boolean;
  variant: "inline" | "sheet";
  showDesktopWebScrollbar: boolean;
}) {
  const enablePreviewDesktopScrollbar =
    variant === "inline" && showDesktopWebScrollbar;
  const previewScrollRef = useRef<RNScrollView>(null);
  const previewScrollbarMetrics = useWebDesktopScrollbarMetrics();

  const handlePreviewScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (enablePreviewDesktopScrollbar) {
        previewScrollbarMetrics.onScroll(event);
      }
    },
    [enablePreviewDesktopScrollbar, previewScrollbarMetrics]
  );

  const handlePreviewLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (enablePreviewDesktopScrollbar) {
        previewScrollbarMetrics.onLayout(event);
      }
    },
    [enablePreviewDesktopScrollbar, previewScrollbarMetrics]
  );

  if (isLoading && !preview) {
    return (
      <View style={styles.sheetCenterState}>
        <ActivityIndicator size="small" />
        <Text style={styles.loadingText}>Loading file…</Text>
      </View>
    );
  }

  if (!preview) {
    return (
      <View style={styles.sheetCenterState}>
        <Text style={styles.emptyText}>No preview available</Text>
      </View>
    );
  }

  if (preview.kind === "text") {
    if (variant === "sheet") {
      return (
        <BottomSheetScrollView style={styles.previewContent}>
          <ScrollView
            contentContainerStyle={styles.previewCodeScrollContent}
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator
          >
            <Text style={styles.codeText}>{preview.content}</Text>
          </ScrollView>
        </BottomSheetScrollView>
      );
    }
    return (
      <View style={styles.previewScrollContainer}>
        <RNScrollView
          onContentSizeChange={
            enablePreviewDesktopScrollbar
              ? previewScrollbarMetrics.onContentSizeChange
              : undefined
          }
          onLayout={
            enablePreviewDesktopScrollbar ? handlePreviewLayout : undefined
          }
          onScroll={
            enablePreviewDesktopScrollbar ? handlePreviewScroll : undefined
          }
          ref={previewScrollRef}
          scrollEventThrottle={enablePreviewDesktopScrollbar ? 16 : undefined}
          showsVerticalScrollIndicator={!enablePreviewDesktopScrollbar}
          style={styles.previewContent}
        >
          <RNScrollView
            contentContainerStyle={styles.previewCodeScrollContent}
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator
          >
            <Text style={styles.codeText}>{preview.content}</Text>
          </RNScrollView>
        </RNScrollView>
        <WebDesktopScrollbarOverlay
          enabled={enablePreviewDesktopScrollbar}
          metrics={previewScrollbarMetrics}
          onScrollToOffset={(nextOffset) => {
            previewScrollRef.current?.scrollTo({
              y: nextOffset,
              animated: false,
            });
          }}
        />
      </View>
    );
  }

  if (preview.kind === "image" && preview.content) {
    if (variant === "sheet") {
      return (
        <BottomSheetScrollView
          contentContainerStyle={styles.previewImageScrollContent}
        >
          <RNImage
            resizeMode="contain"
            source={{
              uri: `data:${preview.mimeType ?? "image/png"};base64,${preview.content}`,
            }}
            style={styles.previewImage}
          />
        </BottomSheetScrollView>
      );
    }
    return (
      <View style={styles.previewScrollContainer}>
        <RNScrollView
          contentContainerStyle={styles.previewImageScrollContent}
          onContentSizeChange={
            enablePreviewDesktopScrollbar
              ? previewScrollbarMetrics.onContentSizeChange
              : undefined
          }
          onLayout={
            enablePreviewDesktopScrollbar ? handlePreviewLayout : undefined
          }
          onScroll={
            enablePreviewDesktopScrollbar ? handlePreviewScroll : undefined
          }
          ref={previewScrollRef}
          scrollEventThrottle={enablePreviewDesktopScrollbar ? 16 : undefined}
          showsVerticalScrollIndicator={!enablePreviewDesktopScrollbar}
          style={styles.previewContent}
        >
          <RNImage
            resizeMode="contain"
            source={{
              uri: `data:${preview.mimeType ?? "image/png"};base64,${preview.content}`,
            }}
            style={styles.previewImage}
          />
        </RNScrollView>
        <WebDesktopScrollbarOverlay
          enabled={enablePreviewDesktopScrollbar}
          metrics={previewScrollbarMetrics}
          onScrollToOffset={(nextOffset) => {
            previewScrollRef.current?.scrollTo({
              y: nextOffset,
              animated: false,
            });
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.sheetCenterState}>
      <Text style={styles.emptyText}>Binary preview unavailable</Text>
      <Text style={styles.binaryMetaText}>
        {formatFileSize({ size: preview.size })}
      </Text>
    </View>
  );
}

function formatFileSize({ size }: { size: number }): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

type EntryDisplayKind = "directory" | "image" | "text" | "other";

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "svg",
  "webp",
  "ico",
]);

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "yml",
  "yaml",
  "toml",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "kt",
  "c",
  "cpp",
  "cc",
  "h",
  "hpp",
  "cs",
  "swift",
  "php",
  "html",
  "css",
  "scss",
  "less",
  "xml",
  "sh",
  "bash",
  "zsh",
  "ini",
  "cfg",
  "conf",
]);

function renderEntryIcon(
  kind: EntryDisplayKind,
  colors: { foreground: string; primary: string; directoryOpen?: boolean }
) {
  const color = colors.foreground;
  switch (kind) {
    case "directory":
      return colors.directoryOpen ? (
        <FolderOpen color={colors.primary} size={18} />
      ) : (
        <Folder color={colors.primary} size={18} />
      );
    case "image":
      return <ImageIcon color={color} size={18} />;
    case "text":
      return <FileText color={color} size={18} />;
    default:
      return <File color={color} size={18} />;
  }
}

function getEntryDisplayKind(entry: ExplorerEntry): EntryDisplayKind {
  if (entry.kind === "directory") {
    return "directory";
  }

  const extension = getExtension(entry.name);
  if (extension === null) {
    return "other";
  }

  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }

  if (TEXT_EXTENSIONS.has(extension)) {
    return "text";
  }

  return "other";
}

function getExtension(name: string): string | null {
  const index = name.lastIndexOf(".");
  if (index === -1 || index === name.length - 1) {
    return null;
  }
  return name.slice(index + 1).toLowerCase();
}

function sortEntries(
  entries: ExplorerEntry[],
  sortOption: SortOption
): ExplorerEntry[] {
  const sorted = [...entries];
  sorted.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === "directory" ? -1 : 1;
    }
    switch (sortOption) {
      case "name":
        return a.name.localeCompare(b.name);
      case "modified":
        return (
          new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
        );
      case "size":
        return b.size - a.size;
      default:
        return 0;
    }
  });
  return sorted;
}

function buildTreeRows({
  directories,
  expandedPaths,
  sortOption,
  path,
  depth,
}: {
  directories: Map<string, { path: string; entries: ExplorerEntry[] }>;
  expandedPaths: Set<string>;
  sortOption: SortOption;
  path: string;
  depth: number;
}): TreeRow[] {
  const directory = directories.get(path);
  if (!directory) {
    return [];
  }

  const rows: TreeRow[] = [];
  const entries = sortEntries(directory.entries, sortOption);

  for (const entry of entries) {
    rows.push({ entry, depth });
    if (entry.kind === "directory" && expandedPaths.has(entry.path)) {
      rows.push(
        ...buildTreeRows({
          directories,
          expandedPaths,
          sortOption,
          path: entry.path,
          depth: depth + 1,
        })
      );
    }
  }

  return rows;
}

function getParentDirectory(path: string): string {
  // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
  const normalized = path.replace(/\/+$/, "");
  if (!normalized || normalized === ".") {
    return ".";
  }
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash === -1) {
    return ".";
  }
  const dir = normalized.slice(0, lastSlash);
  return dir.length > 0 ? dir : ".";
}

function getAncestorDirectories(directory: string): string[] {
  // biome-ignore lint/performance/useTopLevelRegex: scoped regex acceptable here
  const trimmed = directory.replace(/^\.\/+/, "").replace(/\/+$/, "");
  if (!trimmed || trimmed === ".") {
    return ["."];
  }

  const parts = trimmed.split("/").filter(Boolean);
  const ancestors: string[] = ["."];
  let acc = "";
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part;
    ancestors.push(acc);
  }
  return ancestors;
}

function getErrorRecoveryPath(
  state: AgentFileExplorerState | undefined
): string {
  if (!state) {
    return ".";
  }

  const currentHistoryPath =
    state.history.length > 0 ? state.history.at(-1) : null;
  const candidate =
    currentHistoryPath ?? state.lastVisitedPath ?? state.currentPath;

  if (!candidate || candidate.length === 0) {
    return ".";
  }
  return candidate;
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface0,
  },
  desktopSplit: {
    flex: 1,
    flexDirection: "row",
    minHeight: 0,
  },
  treePane: {
    minWidth: 0,
    position: "relative",
  },
  treePaneFill: {
    flex: 1,
  },
  treePaneWithPreview: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  splitResizeHandle: {
    position: "absolute",
    left: -5,
    top: 0,
    bottom: 0,
    width: 10,
    zIndex: 20,
  },
  previewPane: {
    flex: 1,
    minWidth: 0,
  },
  paneHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 32 + theme.spacing[2] * 2,
    paddingHorizontal: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface0,
  },
  paneHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  paneHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    flexShrink: 0,
  },
  previewHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    flexShrink: 0,
  },
  sortButton: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
  },
  sortButtonText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.xs,
  },
  treeList: {
    flex: 1,
    minHeight: 0,
  },
  entriesContent: {
    paddingBottom: theme.spacing[4],
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2],
    padding: theme.spacing[4],
  },
  loadingText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
  },
  errorText: {
    color: theme.colors.destructive,
    fontSize: theme.fontSize.base,
    textAlign: "center",
  },
  retryButton: {
    borderRadius: theme.borderRadius.full,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
  },
  retryButtonText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  errorActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  emptyText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.base,
    textAlign: "center",
  },
  binaryMetaText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
    paddingRight: theme.spacing[2],
  },
  entryRowActive: {
    backgroundColor: theme.colors.surface2,
  },
  entryInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    minWidth: 0,
  },
  entryIcon: {
    flexShrink: 0,
  },
  entryName: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
  },
  menuButton: {
    width: 30,
    height: 30,
    borderRadius: theme.borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  menuButtonActive: {
    backgroundColor: theme.colors.surface2,
  },
  contextMetaBlock: {
    paddingVertical: theme.spacing[1],
  },
  contextMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 32,
    paddingHorizontal: theme.spacing[3],
  },
  contextMetaLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
    flexShrink: 0,
  },
  contextMetaValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
    fontWeight: theme.fontWeight.medium,
    flex: 1,
    minWidth: 0,
    textAlign: "right",
  },
  previewHeaderText: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.normal,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonHovered: {
    backgroundColor: theme.colors.surface2,
  },
  iconButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  refreshIcon: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  previewContent: {
    flex: 1,
  },
  previewScrollContainer: {
    flex: 1,
    minHeight: 0,
    position: "relative",
  },
  previewCodeScrollContent: {
    paddingTop: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    paddingBottom: theme.spacing[3] + theme.spacing[2],
  },
  codeText: {
    color: theme.colors.foreground,
    fontFamily: Fonts.mono,
    fontSize: theme.fontSize.sm,
    flexShrink: 0,
  },
  previewImageScrollContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing[3],
  },
  previewImage: {
    width: "100%",
    aspectRatio: 1,
  },
  sheetBackground: {
    backgroundColor: theme.colors.surface2,
  },
  handleIndicator: {
    backgroundColor: theme.colors.palette.zinc[600],
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderBottomWidth: theme.borderWidth[1],
    borderBottomColor: theme.colors.border,
  },
  sheetTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground,
    flex: 1,
  },
  sheetCloseButton: {
    padding: theme.spacing[2],
  },
  sheetCenterState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2],
    padding: theme.spacing[4],
  },
}));
