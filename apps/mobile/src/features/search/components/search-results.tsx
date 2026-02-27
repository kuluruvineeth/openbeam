import {
  ActivityIndicator,
  FlatList,
  type ListRenderItem,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import type {
  MediaDocument,
  SearchResultDocument,
  UnifiedSearchItem,
} from "../types";
import { SearchMediaRow } from "./search-media-row";
import { SearchResultRow } from "./search-result-row";

type SearchResultsProps = {
  items: UnifiedSearchItem[];
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  onSelectDocument?: (doc: SearchResultDocument) => void;
  onSelectMedia?: (media: MediaDocument) => void;
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
};

function keyExtractor(item: UnifiedSearchItem) {
  return `${item.type}-${item.data.id}`;
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

export function SearchResultsList({
  items,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  onSelectDocument,
  onSelectMedia,
  ListHeaderComponent,
  ListEmptyComponent,
}: SearchResultsProps) {
  const { theme } = useUnistyles();

  const renderItem: ListRenderItem<UnifiedSearchItem> = ({ item }) => {
    if (item.type === "media") {
      return <SearchMediaRow media={item.data} onPress={onSelectMedia} />;
    }
    return <SearchResultRow document={item.data} onPress={onSelectDocument} />;
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

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
    <FlatList
      data={items}
      ItemSeparatorComponent={ItemSeparator}
      keyExtractor={keyExtractor}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={renderFooter}
      ListHeaderComponent={ListHeaderComponent}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      renderItem={renderItem}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
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
