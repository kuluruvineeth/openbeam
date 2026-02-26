import {
  Database,
  FileText,
  History,
  Image,
  Plus,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react-native";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { Text } from "@/components/ui";
import { getSyncStatusConfig } from "../lib/sync-status";

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

function timeUntil(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) {
    return "pending";
  }
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) {
    return `${diffSec}s`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m`;
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr}h`;
  }
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}

import type { SyncStatusType } from "../lib/sync-types";
import { MetricBadge } from "./metric-badge";
import { SyncErrorAlert } from "./sync-error-alert";

type SyncStatusCardProps = {
  connectorId: string;
  syncStatus: SyncStatusType | undefined;
};

function NextSyncRow({
  icon: Icon,
  label,
  nextRunAt,
}: {
  icon: typeof RefreshCw;
  label: string;
  nextRunAt: Date | string;
}) {
  const next = new Date(nextRunAt);
  const timeStr = timeUntil(next);
  return (
    <View style={styles.nextSyncRow}>
      <View style={styles.nextSyncLabel}>
        <Icon color="#9ca3af" size={12} strokeWidth={2} />
        <Text muted style={styles.nextSyncText}>
          {label}
        </Text>
      </View>
      <Text style={styles.nextSyncTime}>{timeStr}</Text>
    </View>
  );
}

export function SyncStatusCard({
  connectorId,
  syncStatus,
}: SyncStatusCardProps) {
  const config = getSyncStatusConfig(syncStatus?.connector?.status);
  const StatusIcon = config.icon;
  const latest = syncStatus?.latestSync;
  const showLatestStats = latest && latest.status !== "SYNCING";

  const documentsAdded = latest?.documentsAdded ?? latest?.dataAdded ?? 0;
  const documentsUpdated = latest?.documentsUpdated ?? latest?.dataUpdated ?? 0;
  const documentsRemoved = latest?.documentsRemoved ?? latest?.dataDeleted ?? 0;
  const filesDiscovered = latest?.filesDiscovered ?? 0;
  const mediaDiscovered = latest?.mediaDiscovered ?? 0;

  const hasDocumentMetrics =
    documentsAdded > 0 || documentsUpdated > 0 || documentsRemoved > 0;
  const hasProcessingMetrics = filesDiscovered > 0 || mediaDiscovered > 0;

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <Text muted style={styles.label}>
          Status
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: config.backgroundColor },
          ]}
        >
          <StatusIcon color={config.color} size={10} strokeWidth={2} />
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </View>

      <View style={styles.indexedRow}>
        <Text muted style={styles.label}>
          Total Indexed
        </Text>
        <Text style={styles.indexedCount}>
          {syncStatus?.stats?.totalIndexed?.toLocaleString() ?? "0"}
        </Text>
      </View>

      {showLatestStats && hasDocumentMetrics && (
        <View style={styles.latestSyncSection}>
          <Text muted style={styles.sectionLabel}>
            Latest Sync
          </Text>
          <View style={styles.metricsGrid}>
            {documentsAdded > 0 && (
              <MetricBadge
                color="green"
                icon={Plus}
                label="Added"
                value={documentsAdded}
              />
            )}
            {documentsUpdated > 0 && (
              <MetricBadge
                color="blue"
                icon={RefreshCw}
                label="Updated"
                value={documentsUpdated}
              />
            )}
            {documentsRemoved > 0 && (
              <MetricBadge
                color="red"
                icon={Trash2}
                label="Removed"
                value={documentsRemoved}
              />
            )}
          </View>

          {hasProcessingMetrics && (
            <View style={styles.processingSection}>
              <Text muted style={styles.sectionLabel}>
                Processing
              </Text>
              <View style={styles.processingMetrics}>
                {filesDiscovered > 0 && (
                  <MetricBadge
                    color="orange"
                    compact
                    icon={FileText}
                    label="Files"
                    value={filesDiscovered}
                  />
                )}
                {mediaDiscovered > 0 && (
                  <MetricBadge
                    color="purple"
                    compact
                    icon={Image}
                    label="Media"
                    value={mediaDiscovered}
                  />
                )}
              </View>
            </View>
          )}
        </View>
      )}

      <View style={styles.infoSection}>
        {syncStatus?.connector?.lastSyncedAt && (
          <View style={styles.infoRow}>
            <History color="#9ca3af" size={12} strokeWidth={2} />
            <Text muted style={styles.infoText}>
              Synced {relativeTime(new Date(syncStatus.connector.lastSyncedAt))}
            </Text>
          </View>
        )}
        {syncStatus?.syncJobs?.incremental?.nextRunAt && (
          <NextSyncRow
            icon={RefreshCw}
            label="Incremental"
            nextRunAt={syncStatus.syncJobs.incremental.nextRunAt}
          />
        )}
        {syncStatus?.syncJobs?.full?.nextRunAt && (
          <NextSyncRow
            icon={Database}
            label="Full sync"
            nextRunAt={syncStatus.syncJobs.full.nextRunAt}
          />
        )}
        {syncStatus?.webhookStatus?.enabled && (
          <View style={styles.infoRow}>
            <Zap color="#16a34a" size={12} strokeWidth={2} />
            <Text style={styles.webhookText}>Real-time active</Text>
          </View>
        )}
      </View>

      {syncStatus?.connector?.lastError && (
        <SyncErrorAlert
          connectorId={connectorId}
          error={syncStatus.connector.lastError}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.spacing[4],
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  indexedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  indexedCount: {
    fontSize: 16,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: theme.colors.foreground,
  },
  latestSyncSection: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    padding: theme.spacing[3],
    gap: theme.spacing[3],
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  processingSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing[3],
    gap: theme.spacing[2],
  },
  processingMetrics: {
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  infoSection: {
    gap: theme.spacing[2],
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  infoText: {
    fontSize: 11,
  },
  webhookText: {
    fontSize: 11,
    color: "#16a34a",
  },
  nextSyncRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nextSyncLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  nextSyncText: {
    fontSize: 11,
  },
  nextSyncTime: {
    fontSize: 11,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
    color: theme.colors.foreground,
    opacity: 0.6,
  },
}));
