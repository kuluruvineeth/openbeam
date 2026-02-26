import { Search } from "lucide-react-native";
import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Text } from "@/components/ui";

type SearchEmptyStateProps = {
  query: string;
};

export function SearchEmptyState({ query }: SearchEmptyStateProps) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Search
          color={theme.colors.mutedForeground}
          size={24}
          strokeWidth={1.5}
        />
      </View>

      <Text style={styles.title} variant="body" weight="medium">
        No results found
      </Text>

      <Text muted style={styles.subtitle} variant="caption">
        No documents match "{query}". Try a different search term or check your
        filters.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[8],
    paddingVertical: theme.spacing[16],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing[4],
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginTop: theme.spacing[2],
    maxWidth: 260,
  },
}));
