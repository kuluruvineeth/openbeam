import type { FieldType } from "@openbeam/types/services/workspace";
import { Pressable, Text, TextInput, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type FieldInputProps = {
  type: FieldType;
  value: unknown;
  enumValues?: string[];
  onChange: (value: unknown) => void;
};

export function FieldInput({
  type,
  value,
  enumValues,
  onChange,
}: FieldInputProps) {
  const stringValue =
    value !== null && value !== undefined ? String(value) : "";

  switch (type) {
    case "number":
    case "currency":
    case "percent":
      return (
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(text) => {
            const num = Number.parseFloat(text);
            onChange(Number.isNaN(num) ? text : num);
          }}
          placeholder="0"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={stringValue}
        />
      );

    case "email":
      return (
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={onChange}
          placeholder="email@example.com"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={stringValue}
        />
      );

    case "phone":
      return (
        <TextInput
          keyboardType="phone-pad"
          onChangeText={onChange}
          placeholder="+1 (555) 000-0000"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={stringValue}
        />
      );

    case "url":
      return (
        <TextInput
          autoCapitalize="none"
          keyboardType="url"
          onChangeText={onChange}
          placeholder="https://"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={stringValue}
        />
      );

    case "date":
    case "datetime":
      return (
        <TextInput
          onChangeText={onChange}
          placeholder={type === "date" ? "YYYY-MM-DD" : "YYYY-MM-DD HH:mm"}
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={stringValue}
        />
      );

    case "enum":
      return (
        <View style={styles.enumContainer}>
          {enumValues?.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={[
                styles.enumOption,
                value === opt && styles.enumOptionSelected,
              ]}
            >
              <Text
                style={[
                  styles.enumText,
                  value === opt && styles.enumTextSelected,
                ]}
              >
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
      );

    case "multi_enum": {
      const selectedValues = Array.isArray(value) ? (value as string[]) : [];
      return (
        <View style={styles.enumContainer}>
          {enumValues?.map((opt) => {
            const isSelected = selectedValues.includes(opt);
            return (
              <Pressable
                key={opt}
                onPress={() => {
                  const next = isSelected
                    ? selectedValues.filter((v) => v !== opt)
                    : [...selectedValues, opt];
                  onChange(next);
                }}
                style={[
                  styles.enumOption,
                  isSelected && styles.enumOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.enumText,
                    isSelected && styles.enumTextSelected,
                  ]}
                >
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      );
    }

    case "richtext":
      return (
        <TextInput
          multiline
          numberOfLines={4}
          onChangeText={onChange}
          placeholder="Enter text..."
          placeholderTextColor="#9ca3af"
          style={[styles.input, styles.textArea]}
          textAlignVertical="top"
          value={stringValue}
        />
      );

    default:
      return (
        <TextInput
          onChangeText={onChange}
          placeholder="Enter value..."
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={stringValue}
        />
      );
  }
}

const styles = StyleSheet.create((theme) => ({
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: theme.spacing[3],
    fontSize: 14,
    color: theme.colors.foreground,
    backgroundColor: theme.colors.card,
  },
  textArea: {
    height: 100,
    paddingTop: theme.spacing[2],
  },
  enumContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  enumOption: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  enumOptionSelected: {
    borderColor: "#3b82f6",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  enumText: {
    fontSize: 13,
    color: theme.colors.foreground,
  },
  enumTextSelected: {
    color: "#3b82f6",
    fontWeight: "500",
  },
}));
