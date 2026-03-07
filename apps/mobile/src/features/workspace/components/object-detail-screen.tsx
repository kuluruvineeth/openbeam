import type { FieldType } from "@openbeam/types/services/workspace";
import {
  Calendar,
  Hash,
  Link,
  List,
  ToggleLeft,
  Type,
} from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import type { WorkspaceObjectDefinition } from "../lib";
import { getFieldDisplayName } from "../lib";

type ObjectDetailScreenProps = {
  object: WorkspaceObjectDefinition;
  onViewEntries: () => void;
  onQuery: () => void;
};

function fieldIcon(type: FieldType) {
  const props = { size: 14, color: "#6b7280", strokeWidth: 1.5 };
  switch (type) {
    case "number":
    case "currency":
    case "percent":
      return <Hash {...props} />;
    case "boolean":
      return <ToggleLeft {...props} />;
    case "date":
    case "datetime":
      return <Calendar {...props} />;
    case "relation":
      return <Link {...props} />;
    case "enum":
    case "multi_enum":
      return <List {...props} />;
    default:
      return <Type {...props} />;
  }
}

export function ObjectDetailScreen({
  object,
  onViewEntries,
  onQuery,
}: ObjectDetailScreenProps) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerBlock}>
          <Text style={styles.name}>{object.name}</Text>
          {object.description ? (
            <Text style={styles.description}>{object.description}</Text>
          ) : null}
          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {object.fields.length} field
                {object.fields.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>View: {object.defaultView}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Fields</Text>
        <View style={styles.fieldsCard}>
          {object.fields.map((field, idx) => (
            <View
              key={field.id}
              style={[styles.fieldRow, idx > 0 && styles.fieldDivider]}
            >
              <View style={styles.fieldIcon}>{fieldIcon(field.type)}</View>
              <View style={styles.fieldInfo}>
                <Text style={styles.fieldName}>{field.name}</Text>
                <Text style={styles.fieldType}>
                  {getFieldDisplayName(field.type)}
                  {field.required ? " (required)" : ""}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable onPress={onViewEntries} style={styles.actionButton}>
            <Text style={styles.actionText}>View Entries</Text>
          </Pressable>
          <Pressable onPress={onQuery} style={styles.actionButtonOutline}>
            <Text style={styles.actionTextOutline}>Query Data</Text>
          </Pressable>
        </View>
      </ScrollView>
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
    gap: theme.spacing[4],
  },
  headerBlock: {
    gap: theme.spacing[2],
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.foreground,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.mutedForeground,
  },
  tagRow: {
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  tag: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.mutedForeground,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing[3],
    gap: theme.spacing[3],
  },
  fieldDivider: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  fieldIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldInfo: {
    flex: 1,
    gap: 2,
  },
  fieldName: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.foreground,
  },
  fieldType: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing[3],
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing[2],
    backgroundColor: "#3b82f6",
    borderRadius: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  actionButtonOutline: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing[2],
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  actionTextOutline: {
    fontSize: 14,
    fontWeight: "500",
    color: "#3b82f6",
  },
}));
