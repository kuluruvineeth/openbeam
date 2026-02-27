import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Button } from "@/components/ui/button";
import { AdaptiveModalSheet, AdaptiveTextInput } from "./adaptive-modal-sheet";

const styles = StyleSheet.create((theme) => ({
  helper: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
  },
  field: {
    marginTop: theme.spacing[3],
    gap: theme.spacing[2],
  },
  label: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
  },
  input: {
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    color: theme.colors.foreground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing[3],
    marginTop: theme.spacing[4],
  },
}));

export interface NameHostModalProps {
  visible: boolean;
  serverId: string;
  hostname: string | null;
  onSkip: () => void;
  onSave: (label: string) => void;
}

export function NameHostModal({
  visible,
  serverId,
  hostname,
  onSkip,
  onSave,
}: NameHostModalProps) {
  const { theme } = useUnistyles();

  const [label, setLabel] = useState("");
  const hasEditedRef = useRef(false);

  const suggested = (hostname?.trim() || serverId).trim();

  useEffect(() => {
    if (!visible) {
      return;
    }
    setLabel(suggested);
    hasEditedRef.current = false;
  }, [suggested, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (hasEditedRef.current) {
      return;
    }
    if (!hostname) {
      return;
    }
    const trimmed = label.trim();
    if (trimmed.length === 0 || trimmed === serverId) {
      setLabel(hostname.trim());
    }
  }, [hostname, label, serverId, visible]);

  const handleChange = useCallback((value: string) => {
    hasEditedRef.current = true;
    setLabel(value);
  }, []);

  const handleSave = useCallback(() => {
    const trimmed = label.trim();
    if (!trimmed) {
      onSkip();
      return;
    }
    onSave(trimmed);
  }, [label, onSave, onSkip]);

  return (
    <AdaptiveModalSheet
      onClose={onSkip}
      testID="name-host-modal"
      title="Name this host"
      visible={visible}
    >
      <Text style={styles.helper}>
        Optional. You can rename this later in Settings.
      </Text>

      <View style={styles.field}>
        <Text style={styles.label}>Label</Text>
        <AdaptiveTextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={handleChange}
          onSubmitEditing={handleSave}
          placeholder={suggested}
          placeholderTextColor={theme.colors.foregroundMuted}
          returnKeyType="done"
          style={styles.input}
          value={label}
        />
      </View>

      <View style={styles.actions}>
        <Button
          onPress={onSkip}
          style={{ flex: 1 }}
          testID="name-host-skip"
          variant="secondary"
        >
          Skip
        </Button>
        <Button
          onPress={handleSave}
          style={{ flex: 1 }}
          testID="name-host-save"
          variant="default"
        >
          Save
        </Button>
      </View>
    </AdaptiveModalSheet>
  );
}
