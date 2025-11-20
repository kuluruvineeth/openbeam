"use client";

import type { UnifiedApp } from "@openplane/integrations";
import Image from "next/image";
import { Icons } from "@/components/icons";
import { TabsContent } from "@/components/ui/tabs";
import { CarouselWithDots } from "./carousel-with-dots";

type UnifiedAppOverviewTabProps = {
  app: UnifiedApp;
};

export function UnifiedAppOverviewTab({ app }: UnifiedAppOverviewTabProps) {
  return (
    <TabsContent className="space-y-6 pt-4" value="overview">
      {app.images.length > 0 && (
        <div className="overflow-hidden border border-border">
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

      <div className="space-y-4">
        <div>
          <h3 className="mb-2 font-semibold text-sm">How it works</h3>
          <p className="text-[#878787] text-sm leading-relaxed">
            {app.description || app.overview}
          </p>
        </div>

        {app.features && app.features.length > 0 && (
          <div>
            <h3 className="mb-2 font-semibold text-sm">Features</h3>
            <ul className="grid grid-cols-1 gap-2">
              {app.features.map((feature) => (
                <li
                  className="flex items-start text-[#878787] text-sm"
                  key={feature}
                >
                  <Icons.CheckIcon className="mt-0.5 mr-2 h-4 w-4 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {app.streams && app.streams.length > 0 && (
          <div className="border-border border-t pt-6">
            <div className="mb-4 flex items-center gap-2">
              <Icons.ShieldIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Data Access & Privacy</h3>
            </div>
            <p className="mb-4 text-muted-foreground text-xs">
              This integration requires access to the following data from your
              workspace:
            </p>
            <div className="space-y-2">
              {app.streams.map((stream) => (
                <div
                  className="group border border-background-300 bg-background-50 p-3 transition-colors hover:border-background-400"
                  key={stream.name}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-background-200">
                      {stream.entityType === "identity" && (
                        <Icons.BotIcon
                          className="text-muted-foreground"
                          size={16}
                        />
                      )}
                      {stream.entityType === "resource" && (
                        <Icons.FileIcon
                          className="text-muted-foreground"
                          size={16}
                        />
                      )}
                      {stream.entityType === "activity" && (
                        <Icons.Messages
                          className="text-muted-foreground"
                          size={16}
                        />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm">
                          {stream.label}
                        </p>
                        {stream.isPii && (
                          <span className="inline-flex items-center gap-1 bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">
                            <Icons.LockIcon className="h-2.5 w-2.5" />
                            PII
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {stream.description}
                      </p>
                      {stream.dataPoints && stream.dataPoints.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {stream.dataPoints.map((point) => (
                            <span
                              className="rounded border border-background-400 bg-background-100 px-2 py-0.5 text-[10px] text-muted-foreground"
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
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 border border-background-300 bg-background-100 p-3">
              <Icons.ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-muted-foreground text-xs leading-relaxed">
                All data is encrypted in transit and at rest. You can revoke
                access at any time by disconnecting the integration.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 border-border border-t pt-6">
          {app.website && (
            <div className="space-y-1">
              <h4 className="font-medium text-[#878787] text-xs">Website</h4>
              <a
                className="flex items-center text-primary text-sm hover:underline"
                href={app.website}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Icons.GlobeIcon className="mr-1.5 h-3.5 w-3.5" />
                Visit site
              </a>
            </div>
          )}
          <div className="space-y-1">
            <h4 className="font-medium text-[#878787] text-xs">Developer</h4>
            <div className="flex items-center text-sm">
              <Icons.InfoIcon className="mr-1.5 h-3.5 w-3.5 text-[#878787]" />
              {app.developerName || "OpenPlane"}
            </div>
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
