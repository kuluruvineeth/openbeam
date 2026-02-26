import {
  ArrowUp,
  Check,
  Mic,
  Pencil,
  RefreshCcw,
  X,
} from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { FOOTER_HEIGHT } from "@/constants/layout";
import type { DictationStatus } from "@/hooks/use-dictation";
import { VolumeMeter } from "./volume-meter";

interface DictationControlsProps {
  volume: number;
  duration: number;
  transcript?: string;
  isRecording: boolean;
  isProcessing: boolean;
  status: DictationStatus;
  onStart: () => void;
  onCancel: () => void;
  onAccept: () => void;
  onAcceptAndSend: () => void;
  onRetry?: () => void;
  onDiscard?: () => void;
  disabled?: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
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
        <Mic color={theme.colors.foreground} size={theme.iconSize.md} />
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
      <Text style={[styles.timerText, { color: theme.colors.foreground }]}>
        {formatDuration(duration)}
      </Text>
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
          <X color={theme.colors.foreground} size={theme.iconSize.sm} />
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
            <RefreshCcw
              color={theme.colors.surface0}
              size={theme.iconSize.sm}
            />
          </Pressable>
        ) : (
          <>
            <Pressable
              accessibilityLabel="Insert transcription"
              onPress={onAccept}
              style={[styles.actionButton, styles.actionButtonSecondary]}
            >
              <Check color={theme.colors.foreground} size={theme.iconSize.sm} />
            </Pressable>
            <Pressable
              accessibilityLabel="Insert transcription and send"
              onPress={onAcceptAndSend}
              style={[styles.actionButton, styles.actionButtonConfirm]}
            >
              <ArrowUp color={theme.colors.surface0} size={theme.iconSize.sm} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
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
}: Omit<DictationControlsProps, "onStart" | "disabled" | "transcript"> & {
  errorText?: string;
}) {
  const { theme } = useUnistyles();
  const isFailed = status === "failed";
  const showActiveState = isRecording || isProcessing || isFailed;
  const actionsDisabled = isProcessing;
  const handleCancel = isFailed && onDiscard ? onDiscard : onCancel;

  if (!showActiveState) {
    return null;
  }

  return (
    <View
      style={[
        overlayStyles.container,
        { backgroundColor: theme.colors.success },
      ]}
    >
      <Pressable
        disabled={actionsDisabled && !isFailed}
        onPress={handleCancel}
        style={[
          overlayStyles.cancelButton,
          actionsDisabled && !isFailed && overlayStyles.buttonDisabled,
        ]}
      >
        <X
          color={theme.colors.palette.white}
          size={theme.iconSize.lg}
          strokeWidth={2.5}
        />
      </Pressable>

      <View style={overlayStyles.centerContainer}>
        <View style={overlayStyles.meterRow}>
          <VolumeMeter
            color="rgba(255, 255, 255, 0.78)"
            isDetecting
            isMuted={false}
            isSpeaking={false}
            orientation="horizontal"
            variant="compact"
            volume={volume}
          />
          <Text
            style={[
              overlayStyles.timerText,
              { color: theme.colors.palette.white },
            ]}
          >
            {formatDuration(duration)}
          </Text>
        </View>
        {isFailed ? (
          <Text
            numberOfLines={2}
            style={[
              overlayStyles.transcriptText,
              { color: theme.colors.palette.white, opacity: 0.95 },
            ]}
          >
            {errorText
              ? `Dictation failed: ${errorText}`
              : "Dictation failed. Tap retry."}
          </Text>
        ) : null}
      </View>

      <View style={overlayStyles.actionButtonsContainer}>
        {actionsDisabled ? (
          <View
            style={[
              overlayStyles.loadingContainer,
              { backgroundColor: "rgba(255, 255, 255, 0.12)" },
            ]}
          >
            <ActivityIndicator
              color={theme.colors.palette.white}
              size="small"
            />
          </View>
          // biome-ignore lint/style/noNestedTernary: readable inline conditional
        ) : isFailed ? (
          <Pressable
            onPress={onRetry}
            style={[
              overlayStyles.actionButton,
              { backgroundColor: theme.colors.palette.white },
            ]}
          >
            <RefreshCcw
              color={theme.colors.success}
              size={theme.iconSize.lg}
              strokeWidth={2.5}
            />
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={onAccept}
              style={[
                overlayStyles.actionButton,
                { backgroundColor: "rgba(255, 255, 255, 0.25)" },
              ]}
            >
              <Pencil
                color={theme.colors.palette.white}
                size={theme.iconSize.lg}
                strokeWidth={2.5}
              />
            </Pressable>
            <Pressable
              onPress={onAcceptAndSend}
              style={[
                overlayStyles.actionButton,
                { backgroundColor: theme.colors.palette.white },
              ]}
            >
              <ArrowUp
                color={theme.colors.success}
                size={theme.iconSize.lg}
                strokeWidth={2.5}
              />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const BUTTON_SIZE = 32;

const styles = StyleSheet.create((theme) => ({
  micButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: theme.borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface0,
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
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
  actionGroup: {
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  actionButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: theme.borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: theme.borderWidth[1],
  },
  actionButtonCancel: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface0,
  },
  actionButtonSecondary: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface0,
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
  statusLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
  },
}));

const OVERLAY_BUTTON_SIZE = 44;
const OVERLAY_VERTICAL_PADDING = (FOOTER_HEIGHT - OVERLAY_BUTTON_SIZE) / 2;

const overlayStyles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderRadius: theme.borderRadius["2xl"],
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[4],
    paddingVertical: OVERLAY_VERTICAL_PADDING,
    height: FOOTER_HEIGHT,
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
    borderRadius: theme.borderRadius.full,
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
    fontSize: theme.fontSize["3xl"],
    fontWeight: theme.fontWeight.bold,
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.35,
  },
  transcriptText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.normal,
    textAlign: "center",
    paddingHorizontal: theme.spacing[2],
    opacity: 0.9,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  actionButton: {
    width: OVERLAY_BUTTON_SIZE,
    height: OVERLAY_BUTTON_SIZE,
    borderRadius: theme.borderRadius.full,
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
    borderRadius: theme.borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
}));
