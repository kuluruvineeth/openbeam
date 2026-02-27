import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import type { WorkspaceEntry, WorkspaceObjectDefinition } from "../lib";
import { getFieldDisplayName } from "../lib";
import { FieldInput } from "./field-input";

type EntryFormScreenProps = {
  object: WorkspaceObjectDefinition;
  entry?: WorkspaceEntry;
  onSave: (values: Record<string, unknown>) => void;
  onCancel: () => void;
  isSaving: boolean;
};

export function EntryFormScreen({
  object,
  entry,
  onSave,
  onCancel,
  isSaving,
}: EntryFormScreenProps) {
  const [values, setValues] = useState<Record<string, unknown>>(
    entry?.values ?? {}
  );

  const isEditing = !!entry;

  function handleFieldChange(fieldName: string, value: unknown) {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
  }

  function handleSubmit() {
    onSave(values);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {object.fields.map((field) => (
          <View key={field.id} style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{field.name}</Text>
              <Text style={styles.typeLabel}>
                {getFieldDisplayName(field.type)}
              </Text>
            </View>
            {field.type === "boolean" ? (
              <Switch
                onValueChange={(v) => handleFieldChange(field.name, v)}
                value={!!values[field.name]}
              />
            ) : (
              <FieldInput
                enumValues={field.enumValues}
                onChange={(v) => handleFieldChange(field.name, v)}
                type={field.type}
                value={values[field.name]}
              />
            )}
            {field.required && !values[field.name] && (
              <Text style={styles.requiredHint}>Required</Text>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          disabled={isSaving}
          onPress={handleSubmit}
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        >
          <Text style={styles.saveText}>
            {/* biome-ignore lint/style/noNestedTernary: readable inline conditional */}
            {isSaving ? "Saving..." : isEditing ? "Update" : "Create"}
          </Text>
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
    gap: theme.spacing[4],
  },
  fieldGroup: {
    gap: theme.spacing[1],
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.foreground,
  },
  typeLabel: {
    fontSize: 11,
    color: theme.colors.mutedForeground,
  },
  requiredHint: {
    fontSize: 11,
    color: "#ef4444",
  },
  footer: {
    flexDirection: "row",
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing[2],
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.foreground,
  },
  saveButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing[2],
    borderRadius: 6,
    backgroundColor: "#3b82f6",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
  },
}));
