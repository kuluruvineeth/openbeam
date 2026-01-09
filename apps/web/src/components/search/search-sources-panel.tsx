"use client";

import { appStore } from "@openplane/integrations";
import { useMemo } from "react";
import { Icons } from "@/components/icons";
import { AppLogo } from "@/components/integrations/app-logo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useConnectors } from "@/hooks/use-connectors";
import { cn } from "@/lib/utils";

type SourceData = {
  type: string;
  label: string;
  app: (typeof appStore)[number] | undefined;
  documentCount: number;
};

type SourceItemProps = {
  source: SourceData;
  isSelected: boolean;
  onToggle: () => void;
};

function SourceItem({ source, isSelected, onToggle }: SourceItemProps) {
  return (
    <Button
      className={cn(
        "h-9 w-full justify-start gap-2.5 px-3 font-normal text-xs",
        isSelected && "bg-foreground/5"
      )}
      onClick={onToggle}
      variant="ghost"
    >
      <div className="flex size-5 shrink-0 items-center justify-center">
        {source.app ? (
          <AppLogo app={source.app} size={16} />
        ) : (
          <Icons.Integrations className="text-foreground/50" size={14} />
        )}
      </div>
      <span className="flex-1 truncate text-left">{source.label}</span>
      <span className="shrink-0 font-mono text-[10px] text-foreground/40 tabular-nums">
        {source.documentCount.toLocaleString()}
      </span>
      {isSelected && (
        <Icons.CheckIcon className="shrink-0 text-foreground/60" size={12} />
      )}
    </Button>
  );
}

function SourcesSkeleton() {
  return (
    <div className="space-y-1 px-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div className="flex h-9 items-center gap-2.5 px-3" key={i}>
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}

function SourcesEmpty() {
  return (
    <p className="px-4 py-6 text-center text-foreground/40 text-xs">
      No sources found
    </p>
  );
}

type SearchSourcesPanelProps = {
  selectedConnectorTypes: string[];
  onConnectorTypesChange: (types: string[] | null) => void;
};

export function SearchSourcesPanel({
  selectedConnectorTypes,
  onConnectorTypesChange,
}: SearchSourcesPanelProps) {
  const { data: connectors, isLoading } = useConnectors();

  const sources = useMemo(() => {
    if (!connectors) {
      return [];
    }
    const sourceMap = new Map<string, SourceData>();

    for (const connector of connectors) {
      const type = connector.app.toLowerCase();
      const existing = sourceMap.get(type);
      const docCount = connector.syncStatus?.stats.totalIndexed ?? 0;

      if (existing) {
        existing.documentCount += docCount;
      } else {
        const app = appStore.find((a) => a.id.toLowerCase() === type);
        sourceMap.set(type, {
          type,
          label: app?.name ?? connector.app,
          app,
          documentCount: docCount,
        });
      }
    }

    return Array.from(sourceMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [connectors]);

  const totalDocuments = sources.reduce((sum, s) => sum + s.documentCount, 0);

  const toggleConnector = (connectorType: string) => {
    if (selectedConnectorTypes.includes(connectorType)) {
      const newSelection = selectedConnectorTypes.filter(
        (t) => t !== connectorType
      );
      onConnectorTypesChange(newSelection.length > 0 ? newSelection : null);
    } else {
      onConnectorTypesChange([...selectedConnectorTypes, connectorType]);
    }
  };

  const hasSelection = selectedConnectorTypes.length > 0;

  return (
    <aside className="flex h-full w-56 flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between px-4 py-3">
        <h3 className="font-medium text-foreground/60 text-xs uppercase tracking-wide">
          Sources
        </h3>
        {hasSelection && (
          <Button
            className="h-6 px-2 text-[10px]"
            onClick={() => onConnectorTypesChange(null)}
            size="sm"
            variant="ghost"
          >
            Clear
          </Button>
        )}
      </header>

      <ScrollArea className="flex-1">
        <nav className="py-2">
          {isLoading && <SourcesSkeleton />}
          {!isLoading && sources.length === 0 && <SourcesEmpty />}
          {!isLoading && sources.length > 0 && (
            <div className="space-y-0.5 px-2">
              {sources.map((source) => (
                <SourceItem
                  isSelected={selectedConnectorTypes.includes(source.type)}
                  key={source.type}
                  onToggle={() => toggleConnector(source.type)}
                  source={source}
                />
              ))}
            </div>
          )}
        </nav>
      </ScrollArea>

      <footer className="shrink-0 px-4 py-3">
        <p className="font-mono text-[10px] text-foreground/40 tabular-nums">
          {totalDocuments.toLocaleString()} documents
          {hasSelection && (
            <span className="text-foreground/30">
              {" "}
              · {selectedConnectorTypes.length} selected
            </span>
          )}
        </p>
      </footer>
    </aside>
  );
}
