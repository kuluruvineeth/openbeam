"use client";

import { cn } from "@/lib/utils";

type Property = {
  label: string;
  value: React.ReactNode;
};

type PropertiesPanelProps = {
  properties: Property[];
  className?: string;
};

export function PropertiesPanel({
  properties,
  className,
}: PropertiesPanelProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {properties.map((prop) => (
        <div className="flex items-start gap-4" key={prop.label}>
          <span className="w-32 shrink-0 text-muted-foreground text-xs">
            {prop.label}
          </span>
          <span className="min-w-0 text-sm">{prop.value}</span>
        </div>
      ))}
    </div>
  );
}
