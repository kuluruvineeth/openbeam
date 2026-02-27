import type { LucideIcon } from "lucide-react-native";
import { File, Search, Video } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";
import type { ContentType } from "../types";

type TabConfig = {
  id: ContentType;
  label: string;
  icon: LucideIcon;
};

const TABS: TabConfig[] = [
  { id: "all", label: "All", icon: Search },
  { id: "documents", label: "Documents", icon: File },
  { id: "media", label: "Media", icon: Video },
];

function getCount(
  tabId: ContentType,
  documentCount: number,
  mediaCount: number
): number {
  if (tabId === "documents") {
    return documentCount;
  }
  if (tabId === "media") {
    return mediaCount;
  }
  return documentCount + mediaCount;
}

type SearchContentTabsProps = {
  value: ContentType;
  onChange: (value: ContentType) => void;
  documentCount: number;
  mediaCount: number;
};

export function SearchContentTabs({
  value,
  onChange,
  documentCount,
  mediaCount,
}: SearchContentTabsProps) {
  const { theme } = useUnistyles();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
    >
      <View style={styles.container}>
        {TABS.map((tab) => {
          const isActive = value === tab.id;
          const count = getCount(tab.id, documentCount, mediaCount);
          const TabIcon = tab.icon;

          return (
            <Pressable
              key={tab.id}
              onPress={() => onChange(tab.id)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <TabIcon
                color={
                  isActive
                    ? theme.colors.foreground
                    : theme.colors.mutedForeground
                }
                size={14}
                strokeWidth={1.5}
              />
              <Text
                style={isActive ? styles.tabTextActive : styles.tabText}
                variant="caption"
              >
                {tab.label}
              </Text>
              {count > 0 && (
                <Text muted style={styles.count} variant="caption">
                  {count.toLocaleString()}
                </Text>
              )}
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
  },
  container: {
    flexDirection: "row",
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabActive: {
    backgroundColor: `${theme.colors.foreground}08`,
    borderColor: theme.colors.foreground,
  },
  tabText: {
    color: theme.colors.mutedForeground,
    fontSize: 12,
  },
  tabTextActive: {
    color: theme.colors.foreground,
    fontSize: 12,
  },
  count: {
    fontSize: 10,
    fontVariant: ["tabular-nums"],
  },
}));
