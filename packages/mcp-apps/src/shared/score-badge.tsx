import { cn } from "./cn";

type Props = {
  score: number;
};

export function ScoreBadge({ score }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs",
        clamped > 80 && "bg-green-500/10 text-green-600",
        clamped > 50 && clamped <= 80 && "bg-yellow-500/10 text-yellow-600",
        clamped <= 50 && "bg-red-500/10 text-red-600"
      )}
    >
      {clamped}
    </span>
  );
}
