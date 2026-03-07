"use client";

import { Button, Icons } from "@openbeam/ui";
import { useAgentCreationParams } from "../hooks/use-agent-creation-params";

export function CreateAgentButton() {
  const { open } = useAgentCreationParams();

  return (
    <Button onClick={open}>
      <Icons.Plus className="mr-2" size={16} />
      New Agent
    </Button>
  );
}
