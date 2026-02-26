import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Skeleton } from "@/components/ui";

function SearchResultRowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton style={styles.iconSkeleton} />
      <View style={styles.content}>
        <View style={styles.metaRow}>
          <Skeleton style={{ height: 12, width: 56 }} />
          <Skeleton style={{ height: 12, width: 80 }} />
          <Skeleton style={{ height: 12, width: 48 }} />
        </View>
        <Skeleton style={styles.titleSkeleton} />
        <Skeleton style={{ height: 12, width: 96 }} />
      </View>
    </View>
  );
}

type SearchResultsSkeletonProps = {
  count?: number;
};

export function SearchResultsSkeleton({
  count = 8,
}: SearchResultsSkeletonProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
        <SearchResultRowSkeleton key={`result-skeleton-${i}`} />
      ))}
    </View>
  );
}

export function SearchPageSkeleton() {
  return (
    <View style={styles.pageContainer}>
      <Skeleton style={styles.searchBarSkeleton} />

      <View style={styles.filterRow}>
        <Skeleton style={{ height: 32, width: 64 }} />
        <Skeleton style={{ height: 32, width: 64 }} />
        <Skeleton style={{ height: 32, width: 80 }} />
      </View>

      <SearchResultsSkeleton />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: 10,
  },
  iconSkeleton: {
    height: 28,
    width: 28,
    borderRadius: 6,
  },
  content: {
    flex: 1,
    gap: theme.spacing[2],
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  titleSkeleton: {
    height: 16,
    width: "80%",
    borderRadius: 6,
  },
  pageContainer: {
    gap: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
  },
  searchBarSkeleton: {
    height: 44,
    width: "100%",
    borderRadius: 8,
  },
  filterRow: {
    flexDirection: "row",
    gap: theme.spacing[2],
  },
}));
