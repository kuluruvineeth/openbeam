import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, type ScrollViewProps } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type PullToRefreshProps = ScrollViewProps & {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
};

export function PullToRefresh({
  onRefresh,
  children,
  ...scrollViewProps
}: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <ScrollView
      {...scrollViewProps}
      refreshControl={
        <RefreshControl
          // biome-ignore lint/complexity/noVoid: fire-and-forget async call
          onRefresh={() => void handleRefresh()}
          refreshing={refreshing}
          tintColor="#6b7280"
        />
      }
      style={[styles.container, scrollViewProps.style]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
}));
