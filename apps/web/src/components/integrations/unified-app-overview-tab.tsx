"use client";

import type { UnifiedApp } from "@openbeam/integrations";
import { TabsContent } from "@openbeam/ui";
import Image from "next/image";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { CarouselWithDots } from "@/components/integrations/carousel-with-dots";
import { cn } from "@/lib/utils";

type UnifiedAppOverviewTabProps = {
  app: UnifiedApp;
};

export function UnifiedAppOverviewTab({ app }: UnifiedAppOverviewTabProps) {
  const [expandedStreams, setExpandedStreams] = useState<Set<string>>(
    new Set()
  );

  const toggleStream = (name: string) => {
    setExpandedStreams((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  return (
    <TabsContent className="space-y-6 pt-5" value="overview">
      {app.images.length > 0 && (
        <div className="overflow-hidden rounded-sm border border-border/40">
          {app.images.length === 1 ? (
            <Image
              alt={app.name}
              className="w-full object-cover"
              height={290}
              quality={100}
              src={app.images[0] as string}
              width={465}
            />
          ) : (
            <CarouselWithDots appName={app.name} images={app.images} />
          )}
        </div>
      )}

      <p className="text-foreground/80 text-sm leading-relaxed">
        {app.description || app.overview}
      </p>

      {app.features && app.features.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {app.features.map((feature) => (
            <span
              className="inline-flex items-center border border-border/60 bg-background px-2.5 py-1 text-foreground/70 text-xs transition-colors hover:border-foreground/20 hover:text-foreground"
              key={feature}
            >
              {feature}
            </span>
          ))}
        </div>
      )}

      {app.streams && app.streams.length > 0 && (
        <div className="space-y-3 border-border/40 border-t pt-6">
          <p className="text-foreground/60 text-xs uppercase tracking-wider">
            {app.name} will access
          </p>

          <div className="space-y-1">
            {app.streams.map((stream) => {
              const isExpanded = expandedStreams.has(stream.name);
              const hasDetails =
                stream.dataPoints && stream.dataPoints.length > 0;

              return (
                <button
                  className="group w-full text-left"
                  key={stream.name}
                  onClick={() => hasDetails && toggleStream(stream.name)}
                  type="button"
                >
                  <div
                    className={cn(
                      "flex items-center justify-between py-2.5 transition-colors",
                      hasDetails && "cursor-pointer hover:bg-foreground/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-foreground/5">
                        {stream.entityType === "identity" && (
                          <Icons.BotIcon
                            className="text-foreground/40"
                            size={12}
                          />
                        )}
                        {stream.entityType === "resource" && (
                          <Icons.FileIcon
                            className="text-foreground/40"
                            size={12}
                          />
                        )}
                        {stream.entityType === "activity" && (
                          <Icons.Messages
                            className="text-foreground/40"
                            size={12}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground text-sm">
                          {stream.label}
                        </span>
                        {stream.isPii && (
                          <span className="rounded-sm bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] text-amber-600 dark:text-amber-400">
                            PII
                          </span>
                        )}
                      </div>
                    </div>
                    {hasDetails && (
                      <Icons.ArrowRight
                        className={cn(
                          "text-foreground/30 transition-transform duration-200",
                          isExpanded && "rotate-90"
                        )}
                        size={14}
                      />
                    )}
                  </div>

                  <div
                    className={cn(
                      "grid transition-all duration-200 ease-out",
                      isExpanded
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="pb-3 pl-9">
                        <p className="mb-2 text-foreground/50 text-xs leading-relaxed">
                          {stream.description}
                        </p>
                        {stream.dataPoints && stream.dataPoints.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {stream.dataPoints.map((point) => (
                              <span
                                className="rounded-sm bg-foreground/5 px-1.5 py-0.5 font-mono text-[10px] text-foreground/40"
                                key={point}
                              >
                                {point}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-foreground/40">
            Data encrypted in transit • Revoke access anytime
          </p>
        </div>
      )}

      {app.website && (
        <div className="border-border/40 border-t pt-4">
          <a
            className="inline-flex items-center gap-1.5 text-foreground/50 text-xs transition-colors hover:text-foreground"
            href={app.website}
            rel="noopener noreferrer"
            target="_blank"
          >
            {app.developerName || app.name}
            <Icons.ArrowRight className="h-3 w-3" />
          </a>
        </div>
      )}
    </TabsContent>
  );
}
