"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Icons,
} from "@openplane/ui";
import { type ReactNode, useState } from "react";

type SidebarSectionProps = {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function SidebarSection({
  title,
  count,
  defaultOpen = true,
  children,
}: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider transition-colors hover:text-foreground">
        <span className="flex items-center gap-1.5">
          {title}
          {count !== undefined && (
            <span className="text-muted-foreground/70">{count}</span>
          )}
        </span>
        <Icons.ChevronDown
          className={`transition-transform duration-150 ${open ? "rotate-0" : "-rotate-90"}`}
          size={14}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
