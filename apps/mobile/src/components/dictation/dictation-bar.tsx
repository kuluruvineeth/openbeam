import { ArrowUp, NotebookPen, X } from "lucide-react-native";
import { Pressable, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { useDictationStore } from "@/stores/dictation-store";
import { baseColors } from "@/styles/theme";
import { ElapsedTimer } from "./elapsed-timer";
import { ProcessingIndicator } from "./processing-indicator";
import { WaveformBars } from "./waveform-bars";

const PILL_HEIGHT = 48;
const BUTTON_SIZE = 32;
const BAR_COUNT = 6;
const WAVEFORM_HEIGHT = 24;

const enterAnimation = SlideInDown.springify().stiffness(420).damping(30);
const exitAnimation = SlideOutDown.duration(200);

type DictationBarProps = {
  onEditNote?: () => void;
};

export function DictationBar({ onEditNote }: DictationBarProps = {}) {
  const state = useDictationStore((s) => s.state);
  const mode = useDictationStore((s) => s.mode);
  const voiceDetected = useDictationStore((s) => s.voiceDetected);
  const elapsedMs = useDictationStore((s) => s.elapsedMs);
  const cancel = useDictationStore((s) => s.cancel);
  const stop = useDictationStore((s) => s.stop);

  if (state === "idle") {
    return null;
  }

  const isRecording = state === "recording";
  const isStarting = state === "starting";
  const isStopping = state === "stopping";
  const isHandsFree = mode === "hands-free";

  return (
    <Animated.View
      entering={enterAnimation}
      exiting={exitAnimation}
      style={styles.wrapper}
    >
      <View style={styles.pill}>
        {(isStarting || isStopping) && (
          <StartingStoppingContent isStopping={isStopping} />
        )}
        {isRecording && isHandsFree && (
          <HandsFreeContent
            cancel={cancel}
            elapsedMs={elapsedMs}
            onEditNote={onEditNote}
            stop={stop}
            voiceDetected={voiceDetected}
          />
        )}
        {isRecording && !isHandsFree && (
          <PttContent elapsedMs={elapsedMs} voiceDetected={voiceDetected} />
        )}
      </View>
    </Animated.View>
  );
}

function StartingStoppingContent({ isStopping }: { isStopping: boolean }) {
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(100)}
      style={styles.centeredRow}
    >
      <ProcessingIndicator color={baseColors.blue[400]} dotSize={5} gap={5} />
      {isStopping && <Text style={styles.statusText}>Processing...</Text>}
    </Animated.View>
  );
}

function HandsFreeContent({
  voiceDetected,
  elapsedMs,
  cancel,
  stop,
  onEditNote,
}: {
  voiceDetected: boolean;
  elapsedMs: number;
  cancel: () => void;
  stop: () => void;
  onEditNote?: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.row}>
      <Pressable
        accessibilityLabel="Cancel dictation"
        hitSlop={8}
        onPress={cancel}
        style={styles.closeButton}
      >
        <X color="#ffffff" size={14} />
      </Pressable>

      <ProcessingIndicator color={baseColors.blue[400]} dotSize={4} gap={3} />

      <WaveformBars
        accentColor="#ffffff"
        barCount={BAR_COUNT}
        height={WAVEFORM_HEIGHT}
        isRecording
        voiceDetected={voiceDetected}
      />

      <ElapsedTimer elapsedMs={elapsedMs} />

      <Pressable
        accessibilityLabel="Save to note"
        hitSlop={8}
        onPress={onEditNote}
        style={styles.editButton}
      >
        <NotebookPen color="#ffffff" size={14} />
      </Pressable>

      <Pressable
        accessibilityLabel="Send transcription"
        hitSlop={8}
        onPress={stop}
        style={styles.sendButton}
      >
        <ArrowUp color="#ffffff" size={14} />
      </Pressable>
    </Animated.View>
  );
}

function PttContent({
  voiceDetected,
  elapsedMs,
}: {
  voiceDetected: boolean;
  elapsedMs: number;
}) {
  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.centeredRow}>
      <WaveformBars
        accentColor="#ffffff"
        barCount={BAR_COUNT}
        height={WAVEFORM_HEIGHT}
        isRecording
        voiceDetected={voiceDetected}
      />
      <ElapsedTimer elapsedMs={elapsedMs} />
    </Animated.View>
  );
}

const styles = StyleSheet.create((_theme) => ({
  wrapper: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
    pointerEvents: "box-none",
  },
  pill: {
    height: PILL_HEIGHT,
    minWidth: 200,
    backgroundColor: "rgba(22, 101, 52, 0.85)",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.6)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  centeredRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  closeButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: baseColors.green[800],
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#ffffff",
  },
}));
