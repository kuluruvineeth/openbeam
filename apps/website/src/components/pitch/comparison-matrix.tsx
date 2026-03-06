"use client";

import { COMPETITOR_FEATURES, COMPETITORS } from "@/data/pitch-data";
import { cn } from "@/lib/cn";

function FeatureCell({ supported }: { supported: boolean }) {
  return (
    <td className="px-4 py-3 text-center">
      {supported ? (
        <span className="font-medium text-[#059669]">&#10003;</span>
      ) : (
        <span className="text-[#878787]/50">&mdash;</span>
      )}
    </td>
  );
}

export function ComparisonMatrix() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-[#2C2C2C] border-b">
            <th className="px-4 py-3 text-left font-medium text-[#878787]">
              Platform
            </th>
            {COMPETITOR_FEATURES.map((feature) => (
              <th
                className="whitespace-nowrap px-4 py-3 text-center font-medium text-[#878787]"
                key={feature}
              >
                {feature}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPETITORS.map((competitor) => (
            <tr
              className={cn(
                "border-[#2C2C2C]/50 border-b transition-colors",
                competitor.highlighted
                  ? "border border-[#2563EB]/30 bg-[#1a1a2e]"
                  : "hover:bg-[#1a1a1a]"
              )}
              key={competitor.name}
            >
              <td className="px-4 py-3">
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "font-medium",
                      competitor.highlighted ? "text-[#2563EB]" : "text-white"
                    )}
                  >
                    {competitor.name}
                  </span>
                  <span className="text-[#878787] text-xs">
                    {competitor.valuation}
                  </span>
                </div>
              </td>
              <FeatureCell supported={competitor.digitalKnowledge} />
              <FeatureCell supported={competitor.physicalTelemetry} />
              <FeatureCell supported={competitor.edgeAirGap} />
              <FeatureCell supported={competitor.aiAgents} />
              <FeatureCell supported={competitor.openSource} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
