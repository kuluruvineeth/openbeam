import { BarChart3, RefreshCw } from "lucide-react-native";
import {
  FlatList,
  type ListRenderItem,
  Pressable,
  Text,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import type { DashboardLayout, DashboardPanel } from "../types";
import { ChartRenderer } from "./chart-renderer";

type DashboardGridProps = {
  layout: DashboardLayout;
  onPanelPress?: (panelId: string) => void;
};

function keyExtractor(item: DashboardPanel) {
  return item.id;
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

export function DashboardGrid({ layout, onPanelPress }: DashboardGridProps) {
  const { theme } = useUnistyles();
  const panels = layout.panels;

  const renderItem: ListRenderItem<DashboardPanel> = ({ item }) => (
    <Pressable onPress={() => onPanelPress?.(item.id)} style={styles.panelCard}>
      {item.config.title && (
        <Text style={styles.panelTitle}>{item.config.title}</Text>
      )}
      <ChartRenderer
        compact={item.type !== "metric"}
        config={item.config}
        data={item.data}
        type={item.type}
      />
    </Pressable>
  );

  const renderHeader = () => {
    if (!layout.title) {
      return null;
    }
    return (
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{layout.title}</Text>
        {layout.refreshInterval && (
          <View style={styles.refreshBadge}>
            <RefreshCw
              color={theme.colors.mutedForeground}
              size={10}
              strokeWidth={1.5}
            />
            <Text
              style={[
                styles.refreshText,
                { color: theme.colors.mutedForeground },
              ]}
            >
              {layout.refreshInterval}s
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <BarChart3
        color={theme.colors.mutedForeground}
        size={28}
        strokeWidth={1.5}
      />
      <Text style={[styles.emptyText, { color: theme.colors.mutedForeground }]}>
        No charts configured
      </Text>
    </View>
  );

  return (
    <FlatList
      data={panels}
      ItemSeparatorComponent={ItemSeparator}
      keyExtractor={keyExtractor}
      ListEmptyComponent={renderEmpty}
      ListHeaderComponent={renderHeader}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  headerTitle: {
    fontSize: 16,
    color: theme.colors.foreground,
  },
  refreshBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  refreshText: {
    fontSize: 10,
  },
  panelCard: {
    marginHorizontal: theme.spacing[4],
    padding: theme.spacing[3],
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    gap: theme.spacing[2],
  },
  panelTitle: {
    fontSize: 13,
    color: theme.colors.foreground,
  },
  separator: {
    height: theme.spacing[3],
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[16],
  },
  emptyText: {
    fontSize: 13,
  },
}));
