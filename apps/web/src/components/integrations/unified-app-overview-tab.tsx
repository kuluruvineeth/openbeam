"use client";

import type { UnifiedApp } from "@openplane/integrations";
import { Check, Globe, Info } from "lucide-react";
import Image from "next/image";
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
                  <Check className="mt-0.5 mr-2 h-4 w-4 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-4">
          {app.website && (
            <div className="space-y-1">
              <h4 className="font-medium text-[#878787] text-xs">Website</h4>
              <a
                className="flex items-center text-primary text-sm hover:underline"
                href={app.website}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Globe className="mr-1.5 h-3.5 w-3.5" />
                Visit site
              </a>
            </div>
          )}
          <div className="space-y-1">
            <h4 className="font-medium text-[#878787] text-xs">Developer</h4>
            <div className="flex items-center text-sm">
              <Info className="mr-1.5 h-3.5 w-3.5 text-[#878787]" />
              {app.developerName || "OpenPlane"}
            </div>
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
