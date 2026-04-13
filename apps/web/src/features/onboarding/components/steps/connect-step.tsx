"use client";

import { Button } from "@openbeam/ui";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { AppLogo } from "@/components/integrations/app-logo";
import { useTRPC } from "@/trpc/client";

const POPULAR_CONNECTORS = [
  "SLACK",
  "NOTION",
  "GOOGLE_DRIVE",
  "GITHUB",
  "JIRA",
  "CONFLUENCE",
  "LINEAR",
  "GMAIL",
];

type Props = {
  onAdvance: (connectorId?: string) => void;
  onSkip: () => void;
};

export function ConnectStep({ onAdvance }: Props) {
  const trpc = useTRPC();
  const router = useRouter();
  const { data: apps } = useQuery(trpc.apps.list.queryOptions());

  const popularApps = (apps ?? []).filter((app) =>
    POPULAR_CONNECTORS.includes(app.type)
  );

  const handleConnect = (appType: string) => {
    const path = `/connectors/setup/${appType.toLowerCase()}` as `/${string}`;
    router.push(path);
  };

  return (
    <div className="space-y-6 py-8">
      <div className="space-y-2">
        <h2 className="font-medium text-lg">Connect a data source</h2>
        <p className="text-muted-foreground text-sm">
          Choose a tool to connect. You can add more later.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {popularApps.map((app) => (
          <button
            className="flex items-center gap-3 border border-border/50 px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-foreground/3"
            key={app.type}
            onClick={() => handleConnect(app.type)}
            type="button"
          >
            <AppLogo app={app} size={20} />
            <span className="min-w-0 flex-1 truncate text-sm">{app.name}</span>
            <Icons.ChevronRight
              className="shrink-0 text-foreground/30"
              size={14}
            />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => router.push("/connectors" as `/${string}`)}
          size="sm"
          variant="outline"
        >
          Browse all connectors
        </Button>
        <button
          className="text-muted-foreground text-xs transition-colors hover:text-foreground"
          onClick={() => onAdvance()}
          type="button"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
