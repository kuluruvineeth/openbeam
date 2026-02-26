import { Modal, Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import type { Agent } from "@/contexts/session-context";

interface ModeSelectorModalProps {
  visible: boolean;
  agent: Agent | null;
  onModeChange: (modeId: string) => void;
  onClose: () => void;
}

export function ModeSelectorModal({
  visible,
  agent,
  onModeChange,
  onClose,
}: ModeSelectorModalProps) {
  // biome-ignore lint/correctness/noUnusedVariables: destructured for side effect
  const { theme } = useUnistyles();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent={true}
      visible={visible}
    >
      <Pressable onPress={onClose} style={styles.modalOverlay}>
        <View style={styles.modeSelectorContent}>
          {agent?.availableModes?.map((mode) => {
            const isActive = mode.id === agent.currentModeId;
            return (
              <Pressable
                key={mode.id}
                onPress={() => {
                  onModeChange(mode.id);
                  onClose();
                }}
                style={[styles.modeItem, isActive && styles.modeItemActive]}
              >
                <Text
                  style={[styles.modeName, isActive && styles.modeNameActive]}
                >
                  {mode.label}
                </Text>
                {mode.description && (
                  <Text
                    style={[
                      styles.modeDescription,
                      isActive && styles.modeDescriptionActive,
                    ]}
                  >
                    {mode.description}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create((theme) => ({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modeSelectorContent: {
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    minWidth: 280,
    maxWidth: 320,
  },
  modeItem: {
    padding: theme.spacing[4],
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing[2],
    backgroundColor: theme.colors.surface2,
  },
  modeItemActive: {
    backgroundColor: theme.colors.primary,
  },
  modeName: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    marginBottom: theme.spacing[1],
  },
  modeNameActive: {
    color: theme.colors.primaryForeground,
  },
  modeDescription: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
  },
  modeDescriptionActive: {
    color: theme.colors.primaryForeground,
    opacity: 0.8,
  },
}));
