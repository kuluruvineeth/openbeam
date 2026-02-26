import { FileText, Plus } from "lucide-react-native";
import { FlatList, Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { EmptyState } from "@/features/layout";
import type { WorkspaceEntry, WorkspaceObjectDefinition } from "../lib";
import { formatFieldValue } from "../lib";

type EntryListScreenProps = {
  object: WorkspaceObjectDefinition;
  entries: WorkspaceEntry[];
  totalEntries: number;
  isLoading: boolean;
  onSelectEntry: (entry: WorkspaceEntry) => void;
  onCreateEntry: () => void;
  onLoadMore: () => void;
};

function EntryRow({
  entry,
  object,
  onPress,
}: {
  entry: WorkspaceEntry;
  object: WorkspaceObjectDefinition;
  onPress: () => void;
}) {
  const displayField = object.displayField ?? object.fields[0]?.name;
  const displayValue = displayField ? entry.values[displayField] : entry.id;
  const secondaryFields = object.fields
    .filter((f) => f.name !== displayField)
    .slice(0, 2);

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowContent}>
        <Text numberOfLines={1} style={styles.rowTitle}>
          {displayValue ? String(displayValue) : "Untitled"}
        </Text>
        <View style={styles.rowMeta}>
          {secondaryFields.map((field) => {
            const value = entry.values[field.name];
            if (value === null || value === undefined) {
              return null;
            }
            return (
              <Text key={field.id} numberOfLines={1} style={styles.rowMetaText}>
                {field.name}: {formatFieldValue(value, field.type)}
              </Text>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}

export function EntryListScreen({
  object,
  entries,
  totalEntries,
  isLoading,
  onSelectEntry,
  onCreateEntry,
  onLoadMore,
}: EntryListScreenProps) {
  const hasMore = entries.length < totalEntries;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.objectName}>{object.name}</Text>
          <Text style={styles.countLabel}>
            {totalEntries} entr{totalEntries === 1 ? "y" : "ies"}
          </Text>
        </View>
        <Pressable onPress={onCreateEntry} style={styles.addButton}>
          <Plus color="#ffffff" size={18} strokeWidth={2} />
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={entries}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              description={`Add your first entry to ${object.name}`}
              icon={<FileText color="#9ca3af" size={24} strokeWidth={1.5} />}
              title="No entries yet"
            />
          )
        }
        onEndReached={hasMore && !isLoading ? onLoadMore : undefined}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => (
          <EntryRow
            entry={item}
            object={object}
            onPress={() => onSelectEntry(item)}
          />
        )}
      />
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  objectName: {
    fontSize: 17,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  countLabel: {
    fontSize: 12,
    marginTop: 2,
    color: theme.colors.mutedForeground,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[2],
    gap: theme.spacing[1],
  },
  row: {
    padding: theme.spacing[3],
    backgroundColor: theme.colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowContent: {
    gap: 4,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.foreground,
  },
  rowMeta: {
    flexDirection: "row",
    gap: theme.spacing[3],
  },
  rowMetaText: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
}));
