import { cn } from "@openbeam/ui/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
};

export function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 py-8 text-center",
        className
      )}
    >
      <span className="font-medium text-sm">{title}</span>
      {description && (
        <span className="max-w-xs text-muted-foreground text-xs">
          {description}
        </span>
      )}
    </div>
  );
}
