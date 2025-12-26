"use client";

import { parseAsString, useQueryStates } from "nuqs";
import { useCallback } from "react";
import { ConnectorOverviewTab } from "@/components/connectors/connector-overview-tab";
import { ConnectorResourcesTab } from "@/components/connectors/connector-resources-tab";
import { ConnectorSettingsTab } from "@/components/connectors/connector-settings-tab";
import { ConnectorSyncHistoryTab } from "@/components/connectors/connector-sync-history-tab";
import { Icons } from "@/components/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type SyncStatus = {
  connector?: {
    id: string;
    status: string | null;
    lastSyncedAt: string | Date | null;
    lastError: string | null;
  };
  stats?: {
    totalIndexed: number;
  };
  resources?: { total: number };
  syncHistory?: { total: number };
} | null;

type ConnectorDetailTabsProps = {
  connectorId: string;
  syncStatus?: SyncStatus;
};

type TabConfig = {
  value: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
};

export function ConnectorDetailTabs({
  connectorId,
  syncStatus,
}: ConnectorDetailTabsProps) {
  const [params, setParams] = useQueryStates({
    tab: parseAsString.withDefault("overview"),
    preview: parseAsString,
  });

  const handleTabChange = useCallback(
    (value: string) => {
      setParams({ tab: value, preview: null });
    },
    [setParams]
  );

  const resourceCount = syncStatus?.resources?.total;

  const tabs: TabConfig[] = [
    {
      value: "overview",
      label: "Overview",
      icon: <Icons.Info size={14} />,
    },
    {
      value: "resources",
      label: "Resources",
      icon: <Icons.Folder size={14} />,
      count: resourceCount,
    },
    {
      value: "history",
      label: "History",
      icon: <Icons.History size={14} />,
      count: syncStatus?.syncHistory?.total,
    },
    {
      value: "settings",
      label: "Settings",
      icon: <Icons.Settings size={14} />,
    },
  ];

  return (
    <Tabs className="w-full" onValueChange={handleTabChange} value={params.tab}>
      <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-border border-b bg-transparent p-0">
        {tabs.map((t) => (
          <TabsTrigger
            className={cn(
              "relative gap-2 rounded-none border-transparent border-b-2 px-4 py-2.5",
              "text-foreground/60 hover:text-foreground",
              "data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            )}
            key={t.value}
            value={t.value}
          >
            <span className="text-foreground/40 transition-colors group-data-[state=active]:text-foreground/70">
              {t.icon}
            </span>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1 rounded-full bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
                {t.count.toLocaleString()}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="h-[calc(100vh-280px)] pt-6">
        <TabsContent className="mt-0 h-full overflow-auto" value="overview">
          <ConnectorOverviewTab connectorId={connectorId} />
        </TabsContent>

        <TabsContent className="mt-0 h-full overflow-auto" value="settings">
          <ConnectorSettingsTab connectorId={connectorId} />
        </TabsContent>

        <TabsContent className="mt-0 h-full overflow-auto" value="history">
          <ConnectorSyncHistoryTab connectorId={connectorId} />
        </TabsContent>

        <TabsContent className="mt-0 h-full" value="resources">
          <ConnectorResourcesTab connectorId={connectorId} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
