import { cn } from "@openbeam/ui/utils";

type StatCardProps = {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
};

export function StatCard({ label, value, trend }: StatCardProps) {
  return (
    <div className="flex flex-col gap-0.5 rounded-sm border border-border/50 p-2.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={cn(
          "font-semibold text-base tabular-nums",
          trend === "up" && "text-emerald-500",
          trend === "down" && "text-red-500",
          (!trend || trend === "neutral") && "text-foreground"
        )}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}
