import { ChevronRight, Database, Table } from "lucide-react-native";
import { FlatList, Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { EmptyState } from "@/features/layout";
import { useWorkspace } from "../hooks";
import type { WorkspaceObjectDefinition } from "../lib";

type ObjectListScreenProps = {
  onSelectObject?: (object: WorkspaceObjectDefinition) => void;
  onQueryPress?: () => void;
};

function ObjectCard({
  object,
  onPress,
}: {
  object: WorkspaceObjectDefinition;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.cardIcon}>
        <Table color="#6b7280" size={20} strokeWidth={1.5} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{object.name}</Text>
        {object.description ? (
          <Text numberOfLines={1} style={styles.cardDescription}>
            {object.description}
          </Text>
        ) : null}
        <Text style={styles.fieldCount}>
          {object.fields.length} field{object.fields.length !== 1 ? "s" : ""}
        </Text>
      </View>
      <ChevronRight color="#9ca3af" size={16} strokeWidth={2} />
    </Pressable>
  );
}

export function ObjectListScreen({
  onSelectObject,
  onQueryPress,
}: ObjectListScreenProps = {}) {
  const { objects, isLoadingObjects } = useWorkspace();

  return (
    <View style={styles.container}>
      <Pressable onPress={onQueryPress} style={styles.queryBanner}>
        <Database color="#3b82f6" size={16} strokeWidth={2} />
        <Text style={styles.queryBannerText}>
          Ask a question about your data
        </Text>
        <ChevronRight color="#3b82f6" size={14} strokeWidth={2} />
      </Pressable>

      <FlatList
        contentContainerStyle={styles.list}
        data={objects}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isLoadingObjects ? null : (
            <EmptyState
              description="Create objects to organize and query your data"
              icon={<Database color="#9ca3af" size={24} strokeWidth={1.5} />}
              title="No workspace objects"
            />
          )
        }
        renderItem={({ item }) => (
          <ObjectCard object={item} onPress={() => onSelectObject?.(item)} />
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
  queryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    margin: theme.spacing[4],
    padding: theme.spacing[3],
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.15)",
  },
  queryBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#3b82f6",
  },
  list: {
    paddingHorizontal: theme.spacing[4],
    gap: theme.spacing[2],
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing[3],
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    marginLeft: theme.spacing[3],
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  cardDescription: {
    fontSize: 13,
    color: theme.colors.mutedForeground,
  },
  fieldCount: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
}));
