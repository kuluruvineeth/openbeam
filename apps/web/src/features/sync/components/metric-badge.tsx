import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const metricBadgeVariants = cva(
  "flex items-center gap-2 border px-2 py-1.5 transition-colors",
  {
    variants: {
      color: {
        green:
          "border-openbeam-green/20 bg-openbeam-green/5 text-openbeam-green",
        blue: "border-openbeam-blue/20 bg-openbeam-blue/5 text-openbeam-blue",
        red: "border-destructive/20 bg-destructive/5 text-destructive",
        orange:
          "border-openbeam-orange/20 bg-openbeam-orange/5 text-openbeam-orange",
        purple:
          "border-openbeam-purple/20 bg-openbeam-purple/5 text-openbeam-purple",
      },
      variant: {
        default: "flex-col text-center",
        compact: "flex-row",
      },
    },
    defaultVariants: {
      color: "green",
      variant: "default",
    },
  }
);

type IconComponent = React.ComponentType<{
  size?: number;
  className?: string;
}>;

type MetricBadgeProps = VariantProps<typeof metricBadgeVariants> & {
  label: string;
  value: number;
  icon: IconComponent;
  className?: string;
};

export function MetricBadge({
  label,
  value,
  color,
  icon: Icon,
  variant,
  className,
}: MetricBadgeProps) {
  const classes = metricBadgeVariants({ color, variant });

  return (
    <output className={cn(classes, className)}>
      <div className="flex items-center gap-1.5">
        <Icon aria-hidden="true" className="opacity-60" size={12} />
        <span className="text-[10px] uppercase tracking-wide opacity-80">
          {label}
        </span>
      </div>
      <span className="font-medium font-mono text-sm tabular-nums">
        {value.toLocaleString()}
      </span>
      <span className="sr-only">
        {value} {label.toLowerCase()}
      </span>
    </output>
  );
}
