import { cn } from "@openbeam/ui/utils";

type Props = {
  className?: string;
};

export function LoadingSkeleton({ className }: Props) {
  return <div className={cn("animate-pulse rounded-sm bg-muted", className)} />;
}
