import { FlatList, type ListRenderItem, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import type { Connector } from "../types";
import { ConnectorRow } from "./connector-row";

type ConnectorsListProps = {
  connectors: Connector[];
  onSelectConnector?: (connector: Connector) => void;
  ListHeaderComponent?: React.ReactElement;
  ListEmptyComponent?: React.ReactElement;
};

function keyExtractor(item: Connector) {
  return item.id;
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

export function ConnectorsList({
  connectors,
  onSelectConnector,
  ListHeaderComponent,
  ListEmptyComponent,
}: ConnectorsListProps) {
  const renderItem: ListRenderItem<Connector> = ({ item }) => (
    <ConnectorRow connector={item} onPress={onSelectConnector} />
  );

  return (
    <FlatList
      data={connectors}
      ItemSeparatorComponent={ItemSeparator}
      keyExtractor={keyExtractor}
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
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
}));
