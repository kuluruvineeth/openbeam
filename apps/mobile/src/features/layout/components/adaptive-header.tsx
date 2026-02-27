import { ArrowLeft } from "lucide-react-native";
import { Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";

const TABLET_BREAKPOINT = 768;

type AdaptiveHeaderProps = {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  onBack?: () => void;
  showBack?: boolean;
};

export function AdaptiveHeader({
  title,
  subtitle,
  leftAction,
  rightAction,
  onBack,
  showBack = false,
}: AdaptiveHeaderProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
        isTablet && styles.containerTablet,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          {showBack && onBack && (
            <Pressable onPress={onBack} style={styles.backButton}>
              <ArrowLeft color="#6b7280" size={20} strokeWidth={2} />
            </Pressable>
          )}
          {leftAction}
          <View style={styles.titleContainer}>
            <Text
              numberOfLines={1}
              style={[styles.title, isTablet && styles.titleTablet]}
            >
              {title}
            </Text>
            {subtitle && (
              <Text muted numberOfLines={1} style={styles.subtitle}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        {rightAction && <View style={styles.right}>{rightAction}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  containerTablet: {
    borderBottomWidth: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    paddingHorizontal: theme.spacing[4],
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  backButton: {
    padding: theme.spacing[1],
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  titleTablet: {
    fontSize: 15,
    fontWeight: "500",
  },
  subtitle: {
    fontSize: 12,
  },
}));
