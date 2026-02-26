import { Pencil, Trash2 } from "lucide-react-native";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import type { WorkspaceEntry, WorkspaceObjectDefinition } from "../lib";
import { formatFieldValue, getFieldDisplayName } from "../lib";

type EntryDetailScreenProps = {
  object: WorkspaceObjectDefinition;
  entry: WorkspaceEntry;
  onEdit: () => void;
  onDelete: () => void;
};

export function EntryDetailScreen({
  object,
  entry,
  onEdit,
  onDelete,
}: EntryDetailScreenProps) {
  function handleDelete() {
    Alert.alert("Delete Entry", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {object.fields.map((field) => {
          const value = entry.values[field.name];
          return (
            <View key={field.id} style={styles.fieldRow}>
              <View style={styles.fieldLabel}>
                <Text style={styles.fieldName}>{field.name}</Text>
                <Text style={styles.fieldType}>
                  {getFieldDisplayName(field.type)}
                </Text>
              </View>
              <Text style={styles.fieldValue}>
                {formatFieldValue(value, field.type)}
              </Text>
            </View>
          );
        })}

        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>ID</Text>
            <Text style={styles.metaValue}>{entry.id}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Created</Text>
            <Text style={styles.metaValue}>
              {new Date(entry.createdAt).toLocaleString()}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Updated</Text>
            <Text style={styles.metaValue}>
              {new Date(entry.updatedAt).toLocaleString()}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={onEdit} style={styles.editButton}>
          <Pencil color="#3b82f6" size={16} strokeWidth={2} />
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
        <Pressable onPress={handleDelete} style={styles.deleteButton}>
          <Trash2 color="#ef4444" size={16} strokeWidth={2} />
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    padding: theme.spacing[4],
    gap: theme.spacing[3],
  },
  fieldRow: {
    gap: theme.spacing[1],
    paddingVertical: theme.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  fieldLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldName: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: theme.colors.mutedForeground,
  },
  fieldType: {
    fontSize: 10,
    color: theme.colors.mutedForeground,
  },
  fieldValue: {
    fontSize: 15,
    color: theme.colors.foreground,
    lineHeight: 22,
  },
  metaSection: {
    marginTop: theme.spacing[4],
    padding: theme.spacing[3],
    backgroundColor: theme.colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing[2],
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  metaValue: {
    fontSize: 12,
    color: theme.colors.foreground,
    fontFamily: "monospace",
  },
  footer: {
    flexDirection: "row",
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[2],
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  editText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#3b82f6",
  },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[2],
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  deleteText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#ef4444",
  },
}));
