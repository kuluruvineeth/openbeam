import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  count?: number;
  action?: ReactNode;
};

export function SectionHeader({ title, count, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-2">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-sm tracking-tight">{title}</h2>
        {count != null && (
          <span className="rounded-sm bg-muted px-1.5 py-0.5 font-medium text-muted-foreground text-xs tabular-nums">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}
