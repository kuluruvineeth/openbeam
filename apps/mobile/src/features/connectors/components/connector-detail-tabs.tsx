import { Pressable, ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";

export type DetailTab = "overview" | "resources" | "history" | "settings";

type ConnectorDetailTabsProps = {
  value: DetailTab;
  onChange: (tab: DetailTab) => void;
};

const TABS: { id: DetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "resources", label: "Resources" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" },
];

export function ConnectorDetailTabs({
  value,
  onChange,
}: ConnectorDetailTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
    >
      <View style={styles.container}>
        {TABS.map((tab) => {
          const isActive = value === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onChange(tab.id)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text
                style={isActive ? styles.tabTextActive : styles.tabText}
                variant="caption"
                weight={isActive ? "medium" : undefined}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  scrollView: {
    flexGrow: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  container: {
    flexDirection: "row",
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[4],
  },
  tab: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: theme.colors.foreground,
  },
  tabText: {
    color: theme.colors.mutedForeground,
    fontSize: 13,
  },
  tabTextActive: {
    color: theme.colors.foreground,
    fontSize: 13,
  },
}));
