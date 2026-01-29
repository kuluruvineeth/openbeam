"use client";

import { AgentsViewSwitch } from "./agents-view-switch";
import { CreateAgentButton } from "./create-agent-button";

export function AgentsActions() {
  return (
    <div className="hidden space-x-2 md:flex">
      <AgentsViewSwitch />
      <CreateAgentButton />
    </div>
  );
}
