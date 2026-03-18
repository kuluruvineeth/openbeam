import { cn } from "@/lib/cn";

interface VersionBadgeProps {
  version: string;
  className?: string;
}

export function VersionBadge({ version, className }: VersionBadgeProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-sm border border-border/50 px-2 py-0.5 font-mono text-muted-foreground text-xs uppercase tracking-wide",
        className
      )}
    >
      {version}
    </span>
  );
}
