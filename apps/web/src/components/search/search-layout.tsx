"use client";

import type { ReactNode } from "react";
import { SearchSourcesPanel } from "@/components/search/search-sources-panel";

type ConnectorFacet = {
  connectorType: string;
  documentCount: number;
};

type SearchLayoutProps = {
  children: ReactNode;
  showSources?: boolean;
  selectedConnectorTypes: string[];
  onConnectorTypesChange: (types: string[] | null) => void;
  connectorFacets: ConnectorFacet[];
  isSearching?: boolean;
};

export function SearchLayout({
  children,
  showSources = true,
  selectedConnectorTypes,
  onConnectorTypesChange,
  connectorFacets,
  isSearching = false,
}: SearchLayoutProps) {
  return (
    <div className="flex h-full">
      <main className="min-w-0 flex-1">{children}</main>

      {showSources && (
        <SearchSourcesPanel
          connectorFacets={connectorFacets}
          isLoading={isSearching}
          onConnectorTypesChange={onConnectorTypesChange}
          selectedConnectorTypes={selectedConnectorTypes}
        />
      )}
    </div>
  );
}
