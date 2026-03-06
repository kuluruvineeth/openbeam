import { CONNECTORS } from "@/data/pitch-data";
import { cn } from "@/lib/cn";

const CATEGORY_BORDERS = {
  saas: "border-[#878787]/30",
  iot: "border-[#0D9488]/30",
  industrial: "border-[#D97706]/30",
} as const;

const CATEGORY_TEXT = {
  saas: "text-[#878787]",
  iot: "text-[#0D9488]",
  industrial: "text-[#D97706]",
} as const;

export function ConnectorGrid() {
  return (
    <div className="flex flex-wrap gap-2">
      {CONNECTORS.map((connector) => (
        <span
          className={cn(
            "rounded-md border bg-[#121212] px-3 py-1.5 text-xs",
            CATEGORY_BORDERS[connector.category],
            CATEGORY_TEXT[connector.category]
          )}
          key={connector.name}
        >
          {connector.name}
        </span>
      ))}
    </div>
  );
}
