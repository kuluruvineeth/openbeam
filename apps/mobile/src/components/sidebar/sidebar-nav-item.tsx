import type { LucideIcon } from "lucide-react-native";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

interface SidebarNavItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  badge?: string | number;
  onPress: () => void;
}

export function SidebarNavItem({
  icon: Icon,
  label,
  active = false,
  badge,
  onPress,
}: SidebarNavItemProps) {
  const { theme } = useUnistyles();

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  const badgeText =
    badge !== undefined && badge !== null && badge !== 0 ? String(badge) : null;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessible
      onPress={handlePress}
    >
      {({ hovered }) => (
        <View
          style={[
            styles.container,
            active && styles.containerActive,
            hovered && !active && styles.containerHovered,
          ]}
        >
          <Icon
            color={
              active
                ? theme.colors.foreground
                : // biome-ignore lint/style/noNestedTernary: readable inline conditional
                  hovered
                  ? theme.colors.foreground
                  : theme.colors.foregroundMuted
            }
            size={16}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              active && styles.labelActive,
              hovered && !active && styles.labelHovered,
            ]}
          >
            {label}
          </Text>
          {badgeText && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing[2],
  },
  containerActive: {
    backgroundColor: theme.colors.surface2,
  },
  containerHovered: {
    backgroundColor: theme.colors.surface1,
  },
  label: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foregroundMuted,
  },
  labelActive: {
    color: theme.colors.foreground,
    fontWeight: theme.fontWeight.medium,
  },
  labelHovered: {
    color: theme.colors.foreground,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[1],
  },
  badgeText: {
    fontSize: 10,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.foregroundMuted,
  },
}));
