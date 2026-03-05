"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ConnectorLogo } from "@/components/connector-logo";
import type { WebsiteConnector } from "@/data/connectors";
import { getCategoryName } from "@/data/connectors";

interface ConnectorCardProps {
  connector: WebsiteConnector;
  index: number;
}

export function ConnectorCard({ connector, index }: ConnectorCardProps) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      initial={{ opacity: 0, y: 12 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: "easeOut" }}
    >
      <Link
        className="group relative flex h-full flex-col border border-border/40 p-5 transition-all duration-200 hover:border-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
        href={`/connectors/${connector.slug}/`}
      >
        <div className="mb-4 flex items-start justify-between">
          <ConnectorLogo appId={connector.id} className="h-12 w-12" />
          {!connector.active && (
            <span className="bg-muted px-2 py-0.5 font-sans text-[11px] text-muted-foreground">
              Coming soon
            </span>
          )}
        </div>

        <h3 className="mb-1 font-medium font-sans text-base text-foreground">
          {connector.name}
        </h3>
        <p className="line-clamp-2 flex-1 font-sans text-muted-foreground text-sm">
          {connector.short_description}
        </p>

        <div className="mt-4 flex items-center justify-between border-border/30 border-t pt-3">
          <span className="font-sans text-muted-foreground text-xs">
            {getCategoryName(connector.category)}
          </span>
          {connector.active && (
            <span className="flex items-center gap-1.5 font-sans text-muted-foreground text-xs">
              <span className="h-1.5 w-1.5 bg-emerald-500" />
              Active
            </span>
          )}
        </div>

        <div
          className="absolute inset-y-0 left-0 w-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ backgroundColor: connector.tint_color }}
        />
      </Link>
    </motion.div>
  );
}
