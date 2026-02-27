import { Search, X } from "lucide-react-native";
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItem,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { useConnectorResources, useToggleResourceSync } from "../hooks";
import type { ConnectorResource } from "../types";
import { ResourceRow } from "./resource-row";

type ConnectorResourcesTabProps = {
  connectorId: string;
  connectorType?: string;
};

function keyExtractor(item: ConnectorResource) {
  return item.id;
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

export function ConnectorResourcesTab({
  connectorId,
}: ConnectorResourcesTabProps) {
  const { theme } = useUnistyles();
  const {
    resources,
    totalCount,
    enabledCount,
    search,
    setSearch,
    clearSearch,
    // biome-ignore lint/correctness/noUnusedVariables: destructured for side effect
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useConnectorResources(connectorId);

  const toggleSync = useToggleResourceSync(connectorId);

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const renderItem: ListRenderItem<ConnectorResource> = ({ item }) => (
    <ResourceRow
      disabled={toggleSync.isPending}
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional no-op
      onPress={() => {}}
      onToggle={(enabled) =>
        toggleSync.mutate({
          connectorId,
          resourceExternalId: item.externalId,
          syncEnabled: enabled,
        })
      }
      resource={item}
    />
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) {
      return null;
    }
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={theme.colors.mutedForeground} size="small" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search
          color={theme.colors.mutedForeground}
          size={14}
          strokeWidth={1.5}
        />
        <TextInput
          onChangeText={setSearch}
          placeholder="Search resources..."
          placeholderTextColor={theme.colors.mutedForeground}
          style={styles.searchInput}
          value={search}
        />
        {search.length > 0 && (
          <Pressable onPress={clearSearch}>
            <X
              color={theme.colors.mutedForeground}
              size={14}
              strokeWidth={1.5}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.summaryRow}>
        <Text muted style={styles.summaryText}>
          {enabledCount} of {totalCount} enabled
        </Text>
      </View>

      <FlatList
        data={resources}
        ItemSeparatorComponent={ItemSeparator}
        keyExtractor={keyExtractor}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    marginHorizontal: theme.spacing[4],
    marginVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.foreground,
    padding: 0,
  },
  summaryRow: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[2],
  },
  summaryText: {
    fontSize: 11,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing[4],
  },
  footer: {
    paddingVertical: theme.spacing[4],
    alignItems: "center",
  },
}));
