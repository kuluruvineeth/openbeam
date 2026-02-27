import { useRef } from "react";
import { TextInput } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { NOTE_TITLE_MAX_LENGTH } from "../constants";

type NoteRenameInputProps = {
  initialValue: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
};

export function NoteRenameInput({
  initialValue,
  onSubmit,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: required by callback signature
  onCancel,
}: NoteRenameInputProps) {
  const { theme } = useUnistyles();
  const valueRef = useRef(initialValue);

  return (
    <TextInput
      autoFocus
      defaultValue={initialValue}
      maxLength={NOTE_TITLE_MAX_LENGTH}
      onBlur={() => onSubmit(valueRef.current)}
      onChangeText={(t) => {
        valueRef.current = t;
      }}
      onSubmitEditing={() => onSubmit(valueRef.current)}
      returnKeyType="done"
      selectTextOnFocus
      style={[styles.input, { color: theme.colors.foreground }]}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  input: {
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
}));
