import { cn } from "@/lib/cn";

const COLOR_MAP = {
  blue: "text-[#2563EB]",
  teal: "text-[#0D9488]",
  amber: "text-[#D97706]",
  green: "text-[#059669]",
  white: "text-foreground",
} as const;

type MetricColor = keyof typeof COLOR_MAP;

interface MetricDisplayProps {
  value: string;
  label: string;
  description?: string;
  color?: MetricColor;
}

export function MetricDisplay({
  value,
  label,
  description,
  color = "white",
}: MetricDisplayProps) {
  return (
    <div>
      <span
        className={cn("font-mono text-[80px] leading-none", COLOR_MAP[color])}
      >
        {value}
      </span>
      <p className="mt-2 text-foreground text-lg">{label}</p>
      {description && (
        <p className="mt-1 text-muted-foreground text-sm">{description}</p>
      )}
    </div>
  );
}
