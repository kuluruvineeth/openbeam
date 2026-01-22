"use client";

import { TooltipProvider } from "@openplane/ui/components/tooltip";
import { AgentCreationSheet } from "./agent-creation-sheet";
import { AgentsHeader } from "./agents-header";
import { AgentsView } from "./agents-view";
import { ScrollableContent } from "./scrollable-content";

export function AgentsListView() {
  return (
    <TooltipProvider>
      <ScrollableContent>
        <AgentsHeader />
        <AgentsView />
      </ScrollableContent>
      <AgentCreationSheet />
    </TooltipProvider>
  );
}
