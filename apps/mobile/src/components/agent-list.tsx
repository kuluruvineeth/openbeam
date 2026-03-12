import { useQueryClient } from "@tanstack/react-query";
import { router, usePathname } from "expo-router";
import { type ReactElement, useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  SectionList,
  type SectionListRenderItem,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { AgentStatusDot } from "@/components/agent-status-dot";
import type { AggregatedAgent } from "@/hooks/use-aggregated-agents";
import {
  CHECKOUT_STATUS_STALE_TIME,
  checkoutStatusQueryKey,
  useCheckoutStatusCacheOnly,
} from "@/hooks/use-checkout-status-query";
import {
  getHostRuntimeStore,
  isHostRuntimeConnected,
} from "@/runtime/host-runtime";
import { useSessionStore } from "@/stores/session-store";
import {
  deriveBranchLabel,
  deriveProjectPath,
} from "@/utils/agent-display-info";
import {
  buildHostAgentDetailRoute,
  parseHostAgentRouteFromPathname,
} from "@/utils/host-routes";
import {
  buildAgentNavigationKey,
  startNavigationTiming,
} from "@/utils/navigation-timing";
import { shortenPath } from "@/utils/shorten-path";
import { formatTimeAgo } from "@/utils/time";

interface AgentListProps {
  agents: AggregatedAgent[];
  showCheckoutInfo?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  selectedAgentId?: string;
  onAgentSelect?: () => void;
  listFooterComponent?: ReactElement | null;
}

interface AgentListSection {
  key: string;
  title: string;
  data: AggregatedAgent[];
}

function deriveDateSectionLabel(lastActivityAt: Date): string {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const activityStart = new Date(
    lastActivityAt.getFullYear(),
    lastActivityAt.getMonth(),
    lastActivityAt.getDate()
  );

  if (activityStart.getTime() >= todayStart.getTime()) {
    return "Today";
  }
  if (activityStart.getTime() >= yesterdayStart.getTime()) {
    return "Yesterday";
  }

  const diffTime = todayStart.getTime() - activityStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) {
    return "This week";
  }
  if (diffDays <= 30) {
    return "This month";
  }
  return "Older";
}

interface AgentListRowInnerProps {
  agent: AggregatedAgent;
  isSelected: boolean;
  showCheckoutInfo: boolean;
  handleAgentLongPress: (agent: AggregatedAgent) => void;
  handleAgentPress: (serverId: string, agentId: string) => void;
}

function AgentListRowInner({
  agent,
  isSelected,
  showCheckoutInfo,
  handleAgentLongPress,
  handleAgentPress,
}: AgentListRowInnerProps) {
  const timeAgo = formatTimeAgo(agent.lastActivityAt);

  const checkoutQuery = useCheckoutStatusCacheOnly({
    serverId: agent.serverId,
    cwd: agent.cwd,
  });
  const checkout = checkoutQuery.data ?? null;
  const projectPath = showCheckoutInfo
    ? deriveProjectPath(agent.cwd, checkout)
    : agent.cwd;
  const branchLabel = showCheckoutInfo ? deriveBranchLabel(checkout) : null;

  return (
    <Pressable
      onLongPress={() => handleAgentLongPress(agent)}
      onPress={() => handleAgentPress(agent.serverId, agent.id)}
      style={({ pressed, hovered }) => [
        styles.agentItem,
        isSelected && styles.agentItemSelected,
        hovered && styles.agentItemHovered,
        pressed && styles.agentItemPressed,
      ]}
      testID={`agent-row-${agent.serverId}-${agent.id}`}
    >
      {({ hovered }) => (
        <View style={styles.agentContent}>
          <View style={styles.row}>
            <AgentStatusDot
              requiresAttention={agent.requiresAttention}
              status={agent.status}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.agentTitle,
                (isSelected || hovered) && styles.agentTitleHighlighted,
              ]}
            >
              {agent.title || "New agent"}
            </Text>
          </View>

          <Text numberOfLines={1} style={styles.secondaryRow}>
            {shortenPath(projectPath)}
            {branchLabel ? ` · ${branchLabel}` : ""} · {timeAgo}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function AgentList({
  agents,
  showCheckoutInfo = true,
  isRefreshing = false,
  onRefresh,
  selectedAgentId,
  onAgentSelect,
  listFooterComponent,
}: AgentListProps) {
  const { theme } = useUnistyles();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [actionAgent, setActionAgent] = useState<AggregatedAgent | null>(null);

  const actionClient = useSessionStore((state) =>
    actionAgent?.serverId
      ? (state.sessions[actionAgent.serverId]?.client ?? null)
      : null
  );

  const isActionSheetVisible = actionAgent !== null;
  const isActionDaemonUnavailable = Boolean(
    actionAgent?.serverId && !actionClient
  );

  const handleAgentPress = useCallback(
    (serverId: string, agentId: string) => {
      if (isActionSheetVisible) {
        return;
      }

      const navigationKey = buildAgentNavigationKey(serverId, agentId);
      startNavigationTiming(navigationKey, {
        from: "home",
        to: "agent",
        params: { serverId, agentId },
      });

      const shouldReplace = Boolean(parseHostAgentRouteFromPathname(pathname));
      const navigate = shouldReplace ? router.replace : router.push;

      onAgentSelect?.();

      // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
      navigate(buildHostAgentDetailRoute(serverId, agentId) as any);
    },
    [isActionSheetVisible, pathname, onAgentSelect]
  );

  const handleAgentLongPress = useCallback((agent: AggregatedAgent) => {
    setActionAgent(agent);
  }, []);

  const handleCloseActionSheet = useCallback(() => {
    setActionAgent(null);
  }, []);

  const handleArchiveAgent = useCallback(() => {
    if (!(actionAgent && actionClient)) {
      return;
    }
    // biome-ignore lint/complexity/noVoid: fire-and-forget async call
    void actionClient.archiveAgent(actionAgent.id);
    setActionAgent(null);
  }, [actionAgent, actionClient]);

  const viewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 30 }),
    []
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!showCheckoutInfo) {
        return;
      }
      for (const token of viewableItems) {
        const agent = token.item as AggregatedAgent | undefined;
        if (!agent) {
          continue;
        }

        const runtime = getHostRuntimeStore();
        const client = runtime.getClient(agent.serverId);
        const isConnected = isHostRuntimeConnected(
          runtime.getSnapshot(agent.serverId)
        );
        if (!(client && isConnected)) {
          continue;
        }

        const queryKey = checkoutStatusQueryKey(agent.serverId, agent.cwd);
        const queryState = queryClient.getQueryState(queryKey);
        const isFetching = queryState?.fetchStatus === "fetching";
        const isFresh =
          typeof queryState?.dataUpdatedAt === "number" &&
          Date.now() - queryState.dataUpdatedAt < CHECKOUT_STATUS_STALE_TIME;
        if (isFetching || isFresh) {
          continue;
        }

        // biome-ignore lint/complexity/noVoid: fire-and-forget async call
        void queryClient
          .prefetchQuery({
            queryKey,
            queryFn: async () => await client.getCheckoutStatus(agent.cwd),
            staleTime: CHECKOUT_STATUS_STALE_TIME,
          })
          .catch((error) => {
            console.warn("[checkout_status] prefetch failed", error);
          });
      }
    },
    [queryClient, showCheckoutInfo]
  );

  const AgentListRow = useCallback(
    ({ agent }: { agent: AggregatedAgent }) => (
      <AgentListRowInner
        agent={agent}
        handleAgentLongPress={handleAgentLongPress}
        handleAgentPress={handleAgentPress}
        isSelected={selectedAgentId === `${agent.serverId}:${agent.id}`}
        showCheckoutInfo={showCheckoutInfo}
      />
    ),
    [handleAgentLongPress, handleAgentPress, selectedAgentId, showCheckoutInfo]
  );

  const sections = useMemo((): AgentListSection[] => {
    const order = [
      "Today",
      "Yesterday",
      "This week",
      "This month",
      "Older",
    ] as const;
    const buckets = new Map<string, AggregatedAgent[]>();
    for (const agent of agents) {
      const label = deriveDateSectionLabel(agent.lastActivityAt);
      const existing = buckets.get(label) ?? [];
      existing.push(agent);
      buckets.set(label, existing);
    }

    const result: AgentListSection[] = [];
    for (const label of order) {
      const data = buckets.get(label);
      if (!data || data.length === 0) {
        continue;
      }
      result.push({ key: `date:${label}`, title: label, data });
    }
    return result;
  }, [agents]);

  const renderAgentItem: SectionListRenderItem<
    AggregatedAgent,
    AgentListSection
  > = useCallback(
    ({ item: agent }) => <AgentListRow agent={agent} />,
    [AgentListRow]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: AgentListSection }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
    ),
    []
  );

  const keyExtractor = useCallback(
    (agent: AggregatedAgent) => `${agent.serverId}:${agent.id}`,
    []
  );

  return (
    <>
      <SectionList
        contentContainerStyle={styles.listContent}
        extraData={selectedAgentId}
        initialNumToRender={12}
        keyboardShouldPersistTaps="handled"
        keyExtractor={keyExtractor}
        ListFooterComponent={listFooterComponent}
        maxToRenderPerBatch={12}
        onViewableItemsChanged={onViewableItemsChanged}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              colors={[theme.colors.foregroundMuted]}
              onRefresh={onRefresh}
              refreshing={isRefreshing}
              tintColor={theme.colors.foregroundMuted}
            />
          ) : undefined
        }
        removeClippedSubviews={true}
        renderItem={renderAgentItem}
        renderSectionHeader={renderSectionHeader}
        sections={sections}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        style={styles.list}
        updateCellsBatchingPeriod={16}
        viewabilityConfig={viewabilityConfig}
        windowSize={7}
      />

      <Modal
        animationType="fade"
        onRequestClose={handleCloseActionSheet}
        transparent
        visible={isActionSheetVisible}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            onPress={handleCloseActionSheet}
            style={styles.sheetBackdrop}
          />
          <View
            style={[
              styles.sheetContainer,
              { paddingBottom: Math.max(insets.bottom, theme.spacing[6]) },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {isActionDaemonUnavailable
                ? "Host offline"
                : "Archive this agent?"}
            </Text>
            <View style={styles.sheetButtonRow}>
              <Pressable
                onPress={handleCloseActionSheet}
                style={[styles.sheetButton, styles.sheetCancelButton]}
                testID="agent-action-cancel"
              >
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={isActionDaemonUnavailable}
                onPress={handleArchiveAgent}
                style={[styles.sheetButton, styles.sheetArchiveButton]}
                testID="agent-action-archive"
              >
                <Text
                  style={[
                    styles.sheetArchiveText,
                    isActionDaemonUnavailable &&
                      styles.sheetArchiveTextDisabled,
                  ]}
                >
                  Archive
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[4],
  },
  sectionHeader: {
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    marginTop: theme.spacing[2],
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: "500",
    color: theme.colors.foregroundMuted,
    textAlign: "left",
  },
  agentItem: {
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing[1],
  },
  agentItemSelected: {
    backgroundColor: theme.colors.surface2,
  },
  agentItemHovered: {
    backgroundColor: theme.colors.surface1,
  },
  agentItemPressed: {
    backgroundColor: theme.colors.surface2,
  },
  agentContent: {
    flex: 1,
    gap: theme.spacing[0],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  agentTitle: {
    flex: 1,
    fontSize: theme.fontSize.base,
    fontWeight: "400",
    color: theme.colors.foreground,
    opacity: 0.8,
  },
  agentTitleHighlighted: {
    color: theme.colors.foreground,
    opacity: 1,
  },
  secondaryRow: {
    fontSize: theme.fontSize.sm,
    fontWeight: "300",
    color: theme.colors.foregroundMuted,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheetContainer: {
    backgroundColor: theme.colors.surface2,
    borderTopLeftRadius: theme.borderRadius["2xl"],
    borderTopRightRadius: theme.borderRadius["2xl"],
    paddingHorizontal: theme.spacing[6],
    paddingTop: theme.spacing[4],
    gap: theme.spacing[4],
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.foregroundMuted,
    opacity: 0.3,
  },
  sheetTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foreground,
    textAlign: "center",
  },
  sheetButtonRow: {
    flexDirection: "row",
    gap: theme.spacing[3],
  },
  sheetButton: {
    flex: 1,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[4],
    alignItems: "center",
    justifyContent: "center",
  },
  sheetArchiveButton: {
    backgroundColor: theme.colors.primary,
  },
  sheetArchiveText: {
    color: theme.colors.primaryForeground,
    fontWeight: theme.fontWeight.semibold,
    fontSize: theme.fontSize.base,
  },
  sheetArchiveTextDisabled: {
    opacity: 0.5,
  },
  sheetCancelButton: {
    backgroundColor: theme.colors.surface1,
  },
  sheetCancelText: {
    color: theme.colors.foreground,
    fontWeight: theme.fontWeight.semibold,
    fontSize: theme.fontSize.base,
  },
}));
