import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const metricBadgeVariants = cva(
  "flex items-center gap-2 border px-2 py-1.5 transition-colors",
  {
    variants: {
      color: {
        green:
          "border-openplane-green/20 bg-openplane-green/5 text-openplane-green",
        blue: "border-openplane-blue/20 bg-openplane-blue/5 text-openplane-blue",
        red: "border-destructive/20 bg-destructive/5 text-destructive",
        orange:
          "border-openplane-orange/20 bg-openplane-orange/5 text-openplane-orange",
        purple:
          "border-openplane-purple/20 bg-openplane-purple/5 text-openplane-purple",
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
