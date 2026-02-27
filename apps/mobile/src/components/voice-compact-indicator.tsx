import { Mic, MicOff, Square } from "lucide-react-native";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { VolumeMeter } from "@/components/volume-meter";
import { useVoice } from "@/contexts/voice-context";

export function VoiceCompactIndicator() {
  const { theme } = useUnistyles();
  const {
    isVoiceMode,
    isVoiceSwitching,
    volume,
    isMuted,
    isDetecting,
    isSpeaking,
    toggleMute,
    stopVoice,
  } = useVoice();

  if (!isVoiceMode) {
    return null;
  }

  return (
    <View style={[styles.container, isMuted && styles.containerMuted]}>
      <View style={styles.meterContainer}>
        <VolumeMeter
          isDetecting={isDetecting}
          isMuted={isMuted}
          isSpeaking={isSpeaking}
          orientation="horizontal"
          variant="compact"
          volume={volume}
        />
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          accessibilityLabel={isMuted ? "Unmute voice" : "Mute voice"}
          accessibilityRole="button"
          disabled={isVoiceSwitching}
          hitSlop={8}
          onPress={toggleMute}
          style={[
            styles.muteButton,
            isVoiceSwitching ? styles.buttonDisabled : undefined,
          ]}
        >
          {isMuted ? (
            <MicOff color={theme.colors.palette.white} size={14} />
          ) : (
            <Mic color={theme.colors.foreground} size={14} />
          )}
        </Pressable>

        <Pressable
          accessibilityLabel="Disable realtime voice mode"
          accessibilityRole="button"
          disabled={isVoiceSwitching}
          hitSlop={8}
          onPress={() => {
            // biome-ignore lint/complexity/noVoid: fire-and-forget async call
            void stopVoice().catch((error) => {
              console.error(
                "[VoiceCompactIndicator] Failed to stop voice mode",
                error
              );
              Alert.alert(
                "Voice failed",
                "Unable to stop realtime voice mode."
              );
            });
          }}
          style={[
            styles.stopButton,
            isVoiceSwitching ? styles.buttonDisabled : undefined,
          ]}
        >
          {isVoiceSwitching ? (
            <ActivityIndicator
              color={theme.colors.palette.white}
              size="small"
            />
          ) : (
            <Square
              color={theme.colors.palette.white}
              fill={theme.colors.palette.white}
              size={14}
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
    gap: theme.spacing[1],
    paddingLeft: theme.spacing[3],
    paddingRight: theme.spacing[1],
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface2,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
  },
  containerMuted: {
    backgroundColor: theme.colors.palette.red[600],
    borderWidth: 0,
  },
  meterContainer: {
    justifyContent: "center",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  muteButton: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  stopButton: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.palette.red[600],
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.palette.red[800],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
}));
