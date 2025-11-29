"use client";

import Link from "next/link";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function ConnectorsEmptyState() {
  return (
    <div className="relative flex h-[calc(100vh-400px)] flex-col items-center justify-center overflow-hidden">
      {/* Background pattern - subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Floating connector icons - decorative */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="-translate-x-1/2 absolute top-1/4 left-1/4 animate-pulse opacity-5">
          <Icons.ConnectorIcon size={120} />
        </div>
        <div className="absolute top-1/3 right-1/4 translate-x-1/2 animate-pulse opacity-5 [animation-delay:500ms]">
          <Icons.Database size={80} />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-sm text-center">
        <p className="text-foreground/40 text-xs uppercase tracking-widest">
          Get started
        </p>
        <h2 className="mt-3 font-semibold text-2xl tracking-tight">
          Connect your first source
        </h2>
        <p className="mt-3 text-foreground/60 text-sm leading-relaxed">
          Link your tools and data will flow automatically.
          <br />
          Gmail, Slack, Notion, and 20+ more.
        </p>

        <Link href="/connectors?tab=available">
          <Button className="mt-6 gap-2" size="lg">
            Browse connectors
            <Icons.ArrowRight size={16} />
          </Button>
        </Link>

        <p className="mt-6 text-foreground/30 text-xs">
          Takes less than 2 minutes to set up
        </p>
      </div>
    </div>
  );
}
