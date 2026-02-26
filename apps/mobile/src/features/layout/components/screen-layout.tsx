import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";

type ScreenLayoutProps = {
  header?: React.ReactNode;
  children: React.ReactNode;
  edges?: Array<"top" | "bottom" | "left" | "right">;
};

export function ScreenLayout({
  header,
  children,
  edges = ["top"],
}: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        edges.includes("top") && { paddingTop: insets.top },
        edges.includes("bottom") && { paddingBottom: insets.bottom },
        edges.includes("left") && { paddingLeft: insets.left },
        edges.includes("right") && { paddingRight: insets.right },
      ]}
    >
      {header}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
}));
