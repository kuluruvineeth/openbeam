import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

function SkeletonBox({
  width,
  height,
}: {
  width: number | string;
  height: number;
}) {
  return <View style={[styles.skeleton, { width: width as number, height }]} />;
}

export function ConnectorRowSkeleton() {
  return (
    <View style={styles.row}>
      <SkeletonBox height={36} width={36} />
      <View style={styles.rowContent}>
        <SkeletonBox height={14} width={120} />
        <SkeletonBox height={10} width={80} />
      </View>
      <SkeletonBox height={20} width={50} />
    </View>
  );
}

export function ConnectorsListSkeleton() {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: 6 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
        <View key={`connector-skeleton-${i}`}>
          <ConnectorRowSkeleton />
          {i < 5 && <View style={styles.separator} />}
        </View>
      ))}
    </View>
  );
}

export function ConnectorOverviewSkeleton() {
  return (
    <View style={styles.overviewContainer}>
      <View style={styles.overviewHeader}>
        <SkeletonBox height={36} width={36} />
        <View style={styles.overviewHeaderContent}>
          <SkeletonBox height={14} width={140} />
          <SkeletonBox height={10} width={80} />
        </View>
        <SkeletonBox height={28} width={60} />
      </View>
      <View style={styles.overviewStats}>
        <SkeletonBox height={10} width={50} />
        <SkeletonBox height={18} width={30} />
      </View>
    </View>
  );
}

export function ConnectorDetailSkeleton() {
  return (
    <View style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <SkeletonBox height={48} width={48} />
        <View style={styles.detailHeaderContent}>
          <SkeletonBox height={20} width={180} />
          <SkeletonBox height={14} width={100} />
        </View>
      </View>
      <View style={styles.detailTabs}>
        {Array.from({ length: 4 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: stable list order
          <SkeletonBox height={14} key={`tab-skeleton-${i}`} width={60} />
        ))}
      </View>
      <SkeletonBox height={200} width="100%" />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  skeleton: {
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  rowContent: {
    flex: 1,
    gap: 6,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing[4],
  },
  listContainer: {
    paddingTop: theme.spacing[2],
  },
  overviewContainer: {
    gap: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  overviewHeaderContent: {
    flex: 1,
    gap: 6,
  },
  overviewStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  detailContainer: {
    gap: theme.spacing[4],
    padding: theme.spacing[4],
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  detailHeaderContent: {
    flex: 1,
    gap: theme.spacing[2],
  },
  detailTabs: {
    flexDirection: "row",
    gap: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
}));
