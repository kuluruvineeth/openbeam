"use client";

import { cn } from "../../utils/cn";
import { Icons } from "../icons";

type CalendarView = "month" | "week" | "list";

interface ViewSwitcherProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  className?: string;
}

const views: { id: CalendarView; icon: React.ReactNode; label: string }[] = [
  {
    id: "month",
    icon: <Icons.LayoutGrid className="h-4 w-4" />,
    label: "Month",
  },
  { id: "week", icon: <Icons.Calendar className="h-4 w-4" />, label: "Week" },
  { id: "list", icon: <Icons.List className="h-4 w-4" />, label: "List" },
];

function CalendarViewSwitcher({
  view,
  onViewChange,
  className,
}: ViewSwitcherProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border p-1",
        className
      )}
    >
      {views.map((v) => (
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
            "transition-colors",
            view === v.id
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          key={v.id}
          onClick={() => onViewChange(v.id)}
          type="button"
        >
          {v.icon}
          <span className="hidden sm:inline">{v.label}</span>
        </button>
      ))}
    </div>
  );
}

export { CalendarViewSwitcher };
export type { CalendarView, ViewSwitcherProps };
