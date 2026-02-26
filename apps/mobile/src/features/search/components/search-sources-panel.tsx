import { Check, Layers, X } from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { getConnectorLabel } from "../lib/display";
import type { ConnectorFacet } from "../types";

type SourceData = {
  type: string;
  label: string;
  documentCount: number;
};

type SourceItemProps = {
  source: SourceData;
  isSelected: boolean;
  onToggle: () => void;
};

function SourceItem({ source, isSelected, onToggle }: SourceItemProps) {
  const { theme } = useUnistyles();

  return (
    <Pressable
      onPress={onToggle}
      style={[styles.sourceItem, isSelected && styles.sourceItemSelected]}
    >
      <View style={styles.sourceIcon}>
        <Layers
          color={theme.colors.mutedForeground}
          size={14}
          strokeWidth={1.5}
        />
      </View>
      <Text numberOfLines={1} style={styles.sourceLabel} variant="caption">
        {source.label}
      </Text>
      <Text muted style={styles.sourceCount} variant="caption">
        {source.documentCount.toLocaleString()}
      </Text>
      {isSelected && (
        <Check color={theme.colors.foreground} size={12} strokeWidth={1.5} />
      )}
    </Pressable>
  );
}

function SourcesEmpty() {
  return (
    <View style={styles.emptyContainer}>
      <Text muted variant="caption">
        No sources found
      </Text>
    </View>
  );
}

type SearchSourcesPanelProps = {
  selectedConnectorTypes: string[];
  onConnectorTypesChange: (types: string[]) => void;
  connectorFacets: ConnectorFacet[];
  onClose?: () => void;
};

export function SearchSourcesPanel({
  selectedConnectorTypes,
  onConnectorTypesChange,
  connectorFacets,
  onClose,
}: SearchSourcesPanelProps) {
  const { theme } = useUnistyles();

  const sources = useMemo(() => {
    const sourceList: SourceData[] = [];

    for (const facet of connectorFacets) {
      if (facet.documentCount === 0) {
        continue;
      }

      const type = facet.connectorType.toLowerCase();
      sourceList.push({
        type,
        label: getConnectorLabel(type),
        documentCount: facet.documentCount,
      });
    }

    return sourceList.sort((a, b) => b.documentCount - a.documentCount);
  }, [connectorFacets]);

  const toggleConnector = (connectorType: string) => {
    if (selectedConnectorTypes.includes(connectorType)) {
      onConnectorTypesChange(
        selectedConnectorTypes.filter((t) => t !== connectorType)
      );
    } else {
      onConnectorTypesChange([...selectedConnectorTypes, connectorType]);
    }
  };

  const hasSelection = selectedConnectorTypes.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} variant="caption" weight="medium">
          SOURCES
        </Text>
        <View style={styles.headerActions}>
          {hasSelection && (
            <Pressable
              onPress={() => onConnectorTypesChange([])}
              style={styles.clearButton}
            >
              <Text muted variant="caption">
                Clear
              </Text>
            </Pressable>
          )}
          {onClose && (
            <Pressable hitSlop={8} onPress={onClose}>
              <X
                color={theme.colors.mutedForeground}
                size={16}
                strokeWidth={1.5}
              />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {sources.length === 0 ? (
          <SourcesEmpty />
        ) : (
          <View style={styles.sourcesList}>
            {sources.map((source) => (
              <SourceItem
                isSelected={selectedConnectorTypes.includes(source.type)}
                key={source.type}
                onToggle={() => toggleConnector(source.type)}
                source={source}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    letterSpacing: 0.5,
    color: theme.colors.mutedForeground,
    fontSize: 11,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  clearButton: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
  },
  scrollView: {
    flex: 1,
  },
  sourcesList: {
    paddingVertical: theme.spacing[2],
    gap: 2,
  },
  sourceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: 10,
  },
  sourceItemSelected: {
    backgroundColor: `${theme.colors.foreground}08`,
  },
  sourceIcon: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceLabel: {
    flex: 1,
    fontSize: 12,
  },
  sourceCount: {
    fontSize: 10,
    fontVariant: ["tabular-nums"],
  },
  emptyContainer: {
    paddingVertical: theme.spacing[8],
    alignItems: "center",
  },
}));
