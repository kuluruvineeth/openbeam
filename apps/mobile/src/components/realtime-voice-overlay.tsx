import { Mic, MicOff, Square } from "lucide-react-native";
import { ActivityIndicator, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { FOOTER_HEIGHT } from "@/constants/layout";
import { VolumeMeter } from "./volume-meter";

interface RealtimeVoiceOverlayProps {
  volume: number;
  isMuted: boolean;
  isDetecting: boolean;
  isSpeaking: boolean;
  isSwitching: boolean;
  onToggleMute: () => void;
  onStop: () => void;
}

const OVERLAY_BUTTON_SIZE = 44;
const OVERLAY_VERTICAL_PADDING = (FOOTER_HEIGHT - OVERLAY_BUTTON_SIZE) / 2;

export function RealtimeVoiceOverlay({
  volume,
  isMuted,
  isDetecting,
  isSpeaking,
  isSwitching,
  onToggleMute,
  onStop,
}: RealtimeVoiceOverlayProps) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.container}>
      <View style={styles.meterContainer}>
        <VolumeMeter
          isDetecting={isDetecting}
          isMuted={isMuted}
          isSpeaking={isSpeaking}
          orientation="horizontal"
          volume={volume}
        />
      </View>

      <View style={styles.actionsContainer}>
        <Pressable
          accessibilityLabel={
            isMuted ? "Unmute realtime voice" : "Mute realtime voice"
          }
          accessibilityRole="button"
          disabled={isSwitching}
          onPress={onToggleMute}
          style={[
            styles.actionButton,
            styles.muteButton,
            isMuted ? styles.muteButtonMuted : undefined,
            isSwitching ? styles.buttonDisabled : undefined,
          ]}
        >
          {isMuted ? (
            <MicOff
              color={theme.colors.palette.white}
              size={theme.iconSize.lg}
              strokeWidth={2.5}
            />
          ) : (
            <Mic
              color={theme.colors.foreground}
              size={theme.iconSize.lg}
              strokeWidth={2.5}
            />
          )}
        </Pressable>

        <Pressable
          accessibilityLabel="Stop realtime voice and interrupt turn"
          accessibilityRole="button"
          disabled={isSwitching}
          onPress={onStop}
          style={[
            styles.actionButton,
            styles.stopButton,
            isSwitching ? styles.buttonDisabled : undefined,
          ]}
        >
          {isSwitching ? (
            <ActivityIndicator
              color={theme.colors.palette.white}
              size="small"
            />
          ) : (
            <Square
              color={theme.colors.palette.white}
              fill={theme.colors.palette.white}
              size={theme.iconSize.lg}
              strokeWidth={2.5}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: FOOTER_HEIGHT,
    borderRadius: theme.borderRadius["2xl"],
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[4],
    paddingVertical: OVERLAY_VERTICAL_PADDING,
    backgroundColor: theme.colors.surface1,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
  },
  meterContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsContainer: {
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
  },
  muteButton: {
    backgroundColor: theme.colors.surface0,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
  },
  muteButtonMuted: {
    backgroundColor: theme.colors.palette.red[600],
    borderColor: theme.colors.palette.red[800],
  },
  stopButton: {
    backgroundColor: theme.colors.palette.red[600],
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.palette.red[800],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
}));
