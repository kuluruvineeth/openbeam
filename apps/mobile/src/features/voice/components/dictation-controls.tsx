import { ArrowUp, Check, Mic, RefreshCcw, X } from "lucide-react-native";
import { ActivityIndicator, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { BUTTON_SIZE } from "../constants";
import type { DictationControlsProps } from "../types";
import { VolumeMeter } from "./volume-meter";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function DictationControls({
  volume,
  duration,
  isRecording,
  isProcessing,
  status,
  onStart,
  onCancel,
  onAccept,
  onAcceptAndSend,
  onRetry,
  onDiscard,
  disabled = false,
}: DictationControlsProps) {
  const { theme } = useUnistyles();
  const isFailed = status === "failed";
  const showActiveState = isRecording || isProcessing || isFailed;
  const actionsDisabled = isProcessing;
  const handleCancel = isFailed && onDiscard ? onDiscard : onCancel;

  if (!showActiveState) {
    return (
      <Pressable
        accessibilityLabel="Start voice dictation"
        accessibilityRole="button"
        disabled={disabled}
        onPress={onStart}
        style={[styles.micButton, disabled && styles.buttonDisabled]}
      >
        <Mic color={theme.colors.foreground} size={20} />
      </Pressable>
    );
  }

  return (
    <View style={styles.activeContainer}>
      <View style={styles.meterWrapper}>
        <VolumeMeter
          isDetecting
          isMuted={false}
          isSpeaking={false}
          orientation="horizontal"
          volume={volume}
        />
      </View>
      <Text style={styles.timerText}>{formatDuration(duration)}</Text>
      <View style={styles.actionGroup}>
        <Pressable
          accessibilityLabel="Cancel dictation"
          disabled={actionsDisabled && !isFailed}
          onPress={handleCancel}
          style={[
            styles.actionButton,
            styles.actionButtonCancel,
            actionsDisabled && !isFailed ? styles.buttonDisabled : undefined,
          ]}
        >
          <X color={theme.colors.foreground} size={16} />
        </Pressable>
        {actionsDisabled ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.foreground} size="small" />
          </View>
          // biome-ignore lint/style/noNestedTernary: readable inline conditional
        ) : isFailed ? (
          <Pressable
            accessibilityLabel="Retry dictation"
            onPress={onRetry}
            style={[styles.actionButton, styles.actionButtonConfirm]}
          >
            <RefreshCcw color={theme.colors.background} size={16} />
          </Pressable>
        ) : (
          <>
            <Pressable
              accessibilityLabel="Insert transcription"
              onPress={onAccept}
              style={[styles.actionButton, styles.actionButtonSecondary]}
            >
              <Check color={theme.colors.foreground} size={16} />
            </Pressable>
            <Pressable
              accessibilityLabel="Insert transcription and send"
              onPress={onAcceptAndSend}
              style={[styles.actionButton, styles.actionButtonConfirm]}
            >
              <ArrowUp color={theme.colors.background} size={16} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  micButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.muted,
  },
  activeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  meterWrapper: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: theme.colors.foreground,
  },
  actionGroup: {
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  actionButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionButtonCancel: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.muted,
  },
  actionButtonSecondary: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.muted,
  },
  actionButtonConfirm: {
    borderColor: theme.colors.foreground,
    backgroundColor: theme.colors.foreground,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  loadingContainer: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
}));
