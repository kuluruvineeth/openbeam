import { FileText, Image, Plus, RefreshCw, Trash2 } from "lucide-react-native";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { getSyncHistoryStatusConfig } from "../lib/sync-status";

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) {
    return "just now";
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  }
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) {
    return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  }
  const diffMo = Math.floor(diffDay / 30);
  if (diffMo < 12) {
    return `${diffMo} month${diffMo === 1 ? "" : "s"} ago`;
  }
  const diffYr = Math.floor(diffMo / 12);
  return `${diffYr} year${diffYr === 1 ? "" : "s"} ago`;
}

import {
  formatDuration,
  parseSyncSummary,
  type SyncHistoryEntry,
} from "../lib/sync-types";
import { SyncStatusBadgeInline } from "./sync-status-badge-inline";

export function SyncHistoryItem({ entry }: { entry: SyncHistoryEntry }) {
  const config = getSyncHistoryStatusConfig(entry.status, entry.errorMessage);
  const summary = parseSyncSummary(entry.summary);

  const added = entry.documentsAdded ?? entry.dataAdded ?? 0;
  const updated = entry.documentsUpdated ?? entry.dataUpdated ?? 0;
  const removed = entry.documentsRemoved ?? entry.dataDeleted ?? 0;
  const files = entry.filesDiscovered ?? summary.filesQueued ?? 0;
  const media = entry.mediaDiscovered ?? summary.mediaQueued ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <SyncStatusBadgeInline config={config} />
        <Text muted style={styles.typeText}>
          {entry.syncJob?.type ?? "FULL"}
        </Text>
        <Text muted style={styles.timeText}>
          {relativeTime(new Date(entry.startedAt))}
        </Text>
      </View>

      <View style={styles.rightSection}>
        <Text muted style={styles.durationText}>
          {formatDuration(entry.durationMs)}
        </Text>

        <View style={styles.countsRow}>
          {added > 0 && (
            <View style={styles.countItem}>
              <Plus color="#16a34a" size={10} strokeWidth={2} />
              <Text style={styles.countGreen}>{added}</Text>
            </View>
          )}
          {updated > 0 && (
            <View style={styles.countItem}>
              <RefreshCw color="#2563eb" size={10} strokeWidth={2} />
              <Text style={styles.countBlue}>{updated}</Text>
            </View>
          )}
          {removed > 0 && (
            <View style={styles.countItem}>
              <Trash2 color="#dc2626" size={10} strokeWidth={2} />
              <Text style={styles.countRed}>{removed}</Text>
            </View>
          )}
        </View>

        {(files > 0 || media > 0) && (
          <View style={styles.processingBadge}>
            {files > 0 && (
              <View style={styles.countItem}>
                <FileText color="#f97316" size={9} strokeWidth={2} />
                <Text style={styles.countOrange}>{files}</Text>
              </View>
            )}
            {media > 0 && (
              <View style={styles.countItem}>
                <Image color="#9333ea" size={9} strokeWidth={2} />
                <Text style={styles.countPurple}>{media}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {entry.errorMessage && (
        <Text numberOfLines={1} style={styles.errorText}>
          {entry.errorMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    flex: 1,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 10,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  durationText: {
    fontSize: 10,
    fontVariant: ["tabular-nums"],
  },
  countsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  countItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  countGreen: {
    fontSize: 10,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: "#16a34a",
  },
  countBlue: {
    fontSize: 10,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: "#2563eb",
  },
  countRed: {
    fontSize: 10,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: "#dc2626",
  },
  countOrange: {
    fontSize: 9,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: "#f97316",
  },
  countPurple: {
    fontSize: 9,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: "#9333ea",
  },
  processingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  errorText: {
    fontSize: 10,
    color: "#dc2626",
    maxWidth: 200,
  },
}));
