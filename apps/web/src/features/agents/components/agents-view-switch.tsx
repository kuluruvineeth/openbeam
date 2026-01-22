"use client";

import { Button } from "@openplane/ui/components/button";
import { cn } from "@openplane/ui/utils";
import { Grid3X3, List } from "lucide-react";
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
        <Grid3X3 size={18} />
      </Button>
      <Button
        className={cn(params.view === "table" && "border-primary text-primary")}
        onClick={() => setView("table")}
        size="icon"
        variant="outline"
      >
        <List size={18} />
      </Button>
    </div>
  );
}
