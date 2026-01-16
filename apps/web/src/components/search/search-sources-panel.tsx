"use client";

import { appStore } from "@openplane/integrations";
import { Button, Skeleton } from "@openplane/ui";
import { useMemo } from "react";
import { Icons } from "@/components/icons";
import { AppLogo } from "@/components/integrations/app-logo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ConnectorFacet = {
  connectorType: string;
  documentCount: number;
};

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
  connectorFacets: ConnectorFacet[];
  isLoading?: boolean;
};

export function SearchSourcesPanel({
  selectedConnectorTypes,
  onConnectorTypesChange,
  connectorFacets,
  isLoading = false,
}: SearchSourcesPanelProps) {
  const sources = useMemo(() => {
    const sourceList: SourceData[] = [];

    for (const facet of connectorFacets) {
      if (facet.documentCount === 0) {
        continue;
      }

      const type = facet.connectorType.toLowerCase();
      const app = appStore.find((a) => a.id.toLowerCase() === type);

      sourceList.push({
        type,
        label: app?.name ?? facet.connectorType,
        app,
        documentCount: facet.documentCount,
      });
    }

    return sourceList.sort((a, b) => b.documentCount - a.documentCount);
  }, [connectorFacets]);

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
    </aside>
  );
}
