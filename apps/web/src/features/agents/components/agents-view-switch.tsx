"use client";

import { Button, Icons } from "@openbeam/ui";
import { cn } from "@openbeam/ui/utils";
import { useAgentParams } from "../hooks/use-agent-params";

export function AgentsViewSwitch() {
  const { params, setView } = useAgentParams();

  return (
    <div className="flex gap-2 text-muted-foreground">
      <Button
        className={cn(params.view === "grid" && "border-primary text-primary")}
        onClick={() => setView("grid")}
        size="icon"
        variant="outline"
      >
        <Icons.Grid3x3 size={18} />
      </Button>
      <Button
        className={cn(params.view === "table" && "border-primary text-primary")}
        onClick={() => setView("table")}
        size="icon"
        variant="outline"
      >
        <Icons.List size={18} />
      </Button>
    </div>
  );
}
