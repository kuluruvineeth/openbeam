import { MicOff, Square } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useDaemonConnections } from "@/contexts/daemon-connections-context";
import { useVoice } from "@/contexts/voice-context";
import { VolumeMeter } from "./volume-meter";

export function VoicePanel() {
  const { theme } = useUnistyles();
  const { connectionStates } = useDaemonConnections();
  const {
    volume,
    isMuted,
    isDetecting,
    isSpeaking,
    stopVoice,
    toggleMute,
    activeServerId,
  } = useVoice();

  const activeHost = activeServerId
    ? (connectionStates.get(activeServerId) ?? null)
    : null;
  const hostLabel = activeHost?.daemon.label ?? null;
  const hostSuffix = hostLabel ? ` (${hostLabel})` : "";

  return (
    <View style={styles.container}>
      <View style={styles.contentRow}>
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

        <View style={styles.actionsRow}>
          <Pressable
            accessibilityLabel={`${isMuted ? "Unmute voice" : "Mute voice"}${hostSuffix}`}
            accessibilityRole="button"
            onPress={toggleMute}
            style={[styles.iconButton, isMuted && styles.iconButtonMuted]}
          >
            <MicOff
              color={
                isMuted ? theme.colors.palette.white : theme.colors.foreground
              }
              size={18}
            />
          </Pressable>

          <Pressable
            accessibilityLabel={`Stop voice mode${hostSuffix}`}
            accessibilityRole="button"
            // biome-ignore lint/complexity/noVoid: fire-and-forget async call
            onPress={() => void stopVoice()}
            style={[styles.iconButton, styles.iconButtonStop]}
          >
            <Square color="white" fill="white" size={16} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[3],
    borderRadius: theme.borderRadius["2xl"],
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface2,
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[3],
  },
  meterContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: theme.spacing[1],
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: theme.spacing[2],
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface0,
    borderWidth: theme.borderWidth[1],
    borderColor: theme.colors.border,
  },
  iconButtonMuted: {
    backgroundColor: theme.colors.palette.red[500],
    borderWidth: 0,
  },
  iconButtonStop: {
    backgroundColor: theme.colors.palette.red[600],
    borderColor: theme.colors.palette.red[800],
  },
}));
