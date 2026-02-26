import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";

type TabItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
};

type TabBarProps = {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (key: string) => void;
  badge?: Record<string, number>;
};

export function TabBar({ tabs, activeTab, onTabPress, badge }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const badgeCount = badge?.[tab.key];

          return (
            <Pressable
              key={tab.key}
              onPress={() => onTabPress(tab.key)}
              style={styles.tab}
            >
              <View style={styles.iconContainer}>
                {isActive && tab.activeIcon ? tab.activeIcon : tab.icon}
                {badgeCount !== undefined && badgeCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {badgeCount > 99 ? "99+" : String(badgeCount)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  bar: {
    flexDirection: "row",
    height: 49,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  iconContainer: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  label: {
    fontSize: 10,
    color: theme.colors.mutedForeground,
  },
  labelActive: {
    color: theme.colors.foreground,
    fontWeight: "500",
  },
}));
