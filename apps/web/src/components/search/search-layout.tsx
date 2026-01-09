"use client";

import type { ReactNode } from "react";
import { SearchSourcesPanel } from "@/components/search/search-sources-panel";

type SearchLayoutProps = {
  children: ReactNode;
  showSources?: boolean;
  selectedConnectorTypes: string[];
  onConnectorTypesChange: (types: string[] | null) => void;
};

export function SearchLayout({
  children,
  showSources = true,
  selectedConnectorTypes,
  onConnectorTypesChange,
}: SearchLayoutProps) {
  return (
    <div className="flex h-full">
      <main className="min-w-0 flex-1">{children}</main>

      {showSources && (
        <SearchSourcesPanel
          onConnectorTypesChange={onConnectorTypesChange}
          selectedConnectorTypes={selectedConnectorTypes}
        />
      )}
    </div>
  );
}
