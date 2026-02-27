import { ArrowUp, Pencil, RefreshCcw, X } from "lucide-react-native";
import { ActivityIndicator, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { OVERLAY_BUTTON_SIZE } from "../constants";
import type { DictationOverlayProps } from "../types";
import { VolumeMeter } from "./volume-meter";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function DictationOverlay({
  volume,
  duration,
  isRecording,
  isProcessing,
  status,
  errorText,
  onCancel,
  onAccept,
  onAcceptAndSend,
  onRetry,
  onDiscard,
}: DictationOverlayProps) {
  const { theme } = useUnistyles();
  const isFailed = status === "failed";
  const showActiveState = isRecording || isProcessing || isFailed;
  const actionsDisabled = isProcessing;
  const handleCancel = isFailed && onDiscard ? onDiscard : onCancel;

  if (!showActiveState) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <Pressable
        disabled={actionsDisabled && !isFailed}
        onPress={handleCancel}
        style={[
          styles.cancelButton,
          actionsDisabled && !isFailed && styles.buttonDisabled,
        ]}
      >
        <X color="#ffffff" size={24} strokeWidth={2.5} />
      </Pressable>

      <View style={styles.centerContainer}>
        <View style={styles.meterRow}>
          <VolumeMeter
            color="rgba(255, 255, 255, 0.78)"
            isDetecting
            isMuted={false}
            isSpeaking={false}
            orientation="horizontal"
            volume={volume}
          />
          <Text style={styles.timerText}>{formatDuration(duration)}</Text>
        </View>
        {isFailed && (
          <Text numberOfLines={2} style={styles.errorText}>
            {errorText
              ? `Dictation failed: ${errorText}`
              : "Dictation failed. Tap retry."}
          </Text>
        )}
      </View>

      <View style={styles.actionButtonsContainer}>
        {actionsDisabled ? (
          <View
            style={[
              styles.loadingContainer,
              { backgroundColor: "rgba(255, 255, 255, 0.12)" },
            ]}
          >
            <ActivityIndicator color="#ffffff" size="small" />
          </View>
          // biome-ignore lint/style/noNestedTernary: readable inline conditional
        ) : isFailed ? (
          <Pressable
            onPress={onRetry}
            style={[styles.actionButton, { backgroundColor: "#ffffff" }]}
          >
            <RefreshCcw
              color={theme.colors.primary}
              size={24}
              strokeWidth={2.5}
            />
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={onAccept}
              style={[
                styles.actionButton,
                { backgroundColor: "rgba(255, 255, 255, 0.25)" },
              ]}
            >
              <Pencil color="#ffffff" size={24} strokeWidth={2.5} />
            </Pressable>
            <Pressable
              onPress={onAcceptAndSend}
              style={[styles.actionButton, { backgroundColor: "#ffffff" }]}
            >
              <ArrowUp
                color={theme.colors.primary}
                size={24}
                strokeWidth={2.5}
              />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderRadius: 16,
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    height: 60,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 3,
  },
  cancelButton: {
    width: OVERLAY_BUTTON_SIZE,
    height: OVERLAY_BUTTON_SIZE,
    borderRadius: OVERLAY_BUTTON_SIZE / 2,
    backgroundColor: "rgba(0, 0, 0, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  centerContainer: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[2],
  },
  meterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[3],
  },
  timerText: {
    fontSize: 26,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.35,
    color: "#ffffff",
  },
  errorText: {
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: theme.spacing[2],
    color: "#ffffff",
    opacity: 0.95,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  actionButton: {
    width: OVERLAY_BUTTON_SIZE,
    height: OVERLAY_BUTTON_SIZE,
    borderRadius: OVERLAY_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    width: OVERLAY_BUTTON_SIZE,
    height: OVERLAY_BUTTON_SIZE,
    borderRadius: OVERLAY_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
}));
