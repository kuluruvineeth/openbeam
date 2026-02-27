import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { AgentList } from "@/components/agent-list";
import { BackHeader } from "@/components/headers/back-header";
import { useAllAgentsList } from "@/hooks/use-all-agents-list";
import { buildHostAgentDraftRoute } from "@/utils/host-routes";

export function AgentsScreen({ serverId }: { serverId: string }) {
  const { agents, isRevalidating, refreshAll } = useAllAgentsList({
    serverId,
  });

  // Track user-initiated refresh to avoid showing spinner on background revalidation
  const [isManualRefresh, setIsManualRefresh] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsManualRefresh(true);
    refreshAll();
  }, [refreshAll]);

  // Reset manual refresh flag when revalidation completes
  useEffect(() => {
    if (!isRevalidating && isManualRefresh) {
      setIsManualRefresh(false);
    }
  }, [isRevalidating, isManualRefresh]);

  const sortedAgents = useMemo(
    () =>
      [...agents].sort((a, b) => {
        if (a.requiresAttention && !b.requiresAttention) {
          return -1;
        }
        if (!a.requiresAttention && b.requiresAttention) {
          return 1;
        }
        return 0;
      }),
    [agents]
  );

  return (
    <View style={styles.container}>
      <BackHeader
        // biome-ignore lint/suspicious/noExplicitAny: React Native type interop
        onBack={() => router.replace(buildHostAgentDraftRoute(serverId) as any)}
        title="All agents"
      />
      <AgentList
        agents={sortedAgents}
        isRefreshing={isManualRefresh && isRevalidating}
        onRefresh={handleRefresh}
        showCheckoutInfo={false}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface0,
  },
}));
