"use client";

import { Button } from "@openplane/ui/components/button";
import { Plus } from "lucide-react";
import { useAgentCreationParams } from "../hooks/use-agent-creation-params";

export function CreateAgentButton() {
  const { open } = useAgentCreationParams();

  return (
    <Button onClick={open}>
      <Plus className="mr-2 size-4" />
      New Agent
    </Button>
  );
}
