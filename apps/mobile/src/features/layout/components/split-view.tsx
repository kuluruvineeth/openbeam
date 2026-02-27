import { useWindowDimensions, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

const TABLET_BREAKPOINT = 768;
const SIDEBAR_WIDTH = 320;

type SplitViewProps = {
  sidebar: React.ReactNode;
  detail: React.ReactNode;
  sidebarWidth?: number;
};

export function SplitView({
  sidebar,
  detail,
  sidebarWidth = SIDEBAR_WIDTH,
}: SplitViewProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  if (!isTablet) {
    return <View style={styles.container}>{detail}</View>;
  }

  return (
    <View style={styles.splitContainer}>
      <View style={[styles.sidebar, { width: sidebarWidth }]}>{sidebar}</View>
      <View style={styles.divider} />
      <View style={styles.detail}>{detail}</View>
    </View>
  );
}

export function useIsTablet() {
  const { width } = useWindowDimensions();
  return width >= TABLET_BREAKPOINT;
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  splitContainer: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    backgroundColor: theme.colors.background,
    borderRightWidth: 0,
  },
  divider: {
    width: 1,
    backgroundColor: theme.colors.border,
  },
  detail: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
}));
