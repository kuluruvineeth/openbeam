import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";

type ElapsedTimerProps = {
  elapsedMs: number;
};

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function ElapsedTimer({ elapsedMs }: ElapsedTimerProps) {
  return <Text style={styles.text}>{formatElapsed(elapsedMs)}</Text>;
}

const styles = StyleSheet.create(() => ({
  text: {
    fontSize: 14,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
    color: "#ffffff",
  },
}));
