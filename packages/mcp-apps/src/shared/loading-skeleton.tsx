import { cn } from "@openbeam/ui/utils";

type BoneProps = {
  className?: string;
};

export function Bone({ className }: BoneProps) {
  return <div className={cn("animate-pulse rounded-sm bg-muted", className)} />;
}

export function LoadingSkeleton({ className }: BoneProps) {
  return <Bone className={className} />;
}
