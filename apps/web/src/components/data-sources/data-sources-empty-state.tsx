"use client";

import Link from "next/link";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function DataSourcesEmptyState() {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden border border-border/40 bg-gradient-to-b from-background to-foreground/[0.01] py-16">
      {/* Decorative dots */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-8 left-8 size-1 rounded-full bg-foreground/10" />
        <div className="absolute top-12 right-16 size-1.5 rounded-full bg-foreground/5" />
        <div className="absolute bottom-16 left-24 size-1 rounded-full bg-foreground/10" />
        <div className="absolute right-12 bottom-8 size-2 rounded-full bg-foreground/5" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-xs text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-border/60 bg-background shadow-sm">
          <Icons.Integrations className="text-foreground/40" size={24} />
        </div>

        <h3 className="font-medium text-foreground text-lg tracking-tight">
          No data sources yet
        </h3>
        <p className="mt-2 text-foreground/50 text-sm">
          Connect integrations to start indexing your organization's knowledge
        </p>

        <Link href="/connectors?tab=available">
          <Button className="mt-5" variant="outline">
            Add data source
          </Button>
        </Link>
      </div>
    </div>
  );
}
