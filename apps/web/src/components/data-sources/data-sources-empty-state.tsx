"use client";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function DataSourcesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center border border-border bg-background py-12">
      <Icons.Integrations className="mb-4 text-muted-foreground" size={48} />
      <h3 className="font-medium text-lg">No data sources connected</h3>
      <p className="mt-2 text-[#878787] text-sm">
        Connect your first data source to start indexing
      </p>
      <Button
        className="mt-4"
        onClick={() => {
          window.location.href = "/integrations";
        }}
        variant="outline"
      >
        Browse Integrations
      </Button>
    </div>
  );
}
