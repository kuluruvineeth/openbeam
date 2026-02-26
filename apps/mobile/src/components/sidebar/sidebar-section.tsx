import { ChevronDown } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { useSidebarCollapsedSectionsStore } from "@/stores/sidebar-collapsed-sections-store";

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  action?: React.ReactNode;
}

function deriveSectionId(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function SidebarSection({
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
  action,
}: SidebarSectionProps) {
  const { theme } = useUnistyles();
  const sectionId = deriveSectionId(title);

  const collapsedSections = useSidebarCollapsedSectionsStore(
    (s) => s.collapsedSidebarSections
  );
  const toggleSection = useSidebarCollapsedSectionsStore(
    (s) => s.toggleSidebarSection
  );

  const isCollapsed = collapsible && collapsedSections.has(sectionId);

  const [contentHeight, setContentHeight] = useState(0);
  const progress = useSharedValue(defaultCollapsed ? 0 : 1);

  const handleToggle = useCallback(() => {
    if (!collapsible) {
      return;
    }
    const willCollapse = !isCollapsed;
    toggleSection(sectionId);
    progress.value = withTiming(willCollapse ? 0 : 1, {
      duration: 200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [collapsible, isCollapsed, sectionId, toggleSection, progress]);

  const contentStyle = useAnimatedStyle(() => {
    if (contentHeight === 0) {
      return { overflow: "hidden" as const };
    }
    return {
      height: interpolate(progress.value, [0, 1], [0, contentHeight]),
      overflow: "hidden" as const,
      opacity: progress.value,
    };
  });

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(progress.value, [0, 1], [-90, 0])}deg` },
    ],
  }));

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel={title}
        accessibilityRole={collapsible ? "button" : "header"}
        accessibilityState={
          collapsible ? { expanded: !isCollapsed } : undefined
        }
        accessible
        onPress={collapsible ? handleToggle : undefined}
        style={styles.header}
      >
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerRight}>
          {action}
          {collapsible && (
            <Animated.View style={chevronStyle}>
              <ChevronDown color={theme.colors.foregroundMuted} size={12} />
            </Animated.View>
          )}
        </View>
      </Pressable>
      <Animated.View style={contentStyle}>
        <View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && h !== contentHeight) {
              setContentHeight(h);
            }
          }}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
  },
  title: {
    fontSize: 11,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.foregroundMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
}));
