import { Skeleton } from "@openbeam/ui/components/skeleton";

type BoneProps = {
  className?: string;
};

export function Bone({ className }: BoneProps) {
  return <Skeleton className={className} />;
}

export function LoadingSkeleton({ className }: BoneProps) {
  return <Skeleton className={className} />;
}
