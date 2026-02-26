"use client";

import { Icons } from "@openplane/ui";
import { Button } from "@openplane/ui/components/button";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { HEADER_INNER_HEIGHT } from "../constants";
import {
  buildDaemonAgentDetailRoute,
  daemonNavigate,
} from "../lib/host-routes";
import { AgentList } from "./agent-list";

export function AgentsScreen({ serverId }: { serverId: string }) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleNewAgent = useCallback(() => {
    daemonNavigate(router, buildDaemonAgentDetailRoute(serverId, "new"));
  }, [router, serverId]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        className="flex shrink-0 items-center gap-2 border-border/30 border-b px-3"
        style={{ height: HEADER_INNER_HEIGHT }}
      >
        <Button
          className="size-7"
          onClick={handleBack}
          size="icon"
          variant="ghost"
        >
          <Icons.ArrowLeft className="size-4" />
        </Button>
        <h1 className="flex-1 font-semibold text-foreground text-sm">
          All agents
        </h1>
        <Button
          className="size-7"
          onClick={handleNewAgent}
          size="icon"
          variant="ghost"
        >
          <Icons.Plus className="size-4" />
        </Button>
      </div>
      <AgentList serverId={serverId} />
    </div>
  );
}
