"use client";

import { useHotkeys } from "react-hotkeys-hook";
import { useChatTab } from "@/hooks/use-chat-tab";
import { AgentHeader } from "./new-chat/agent-header";
import { AskView } from "./new-chat/ask-view";
import { ChatTabs } from "./new-chat/chat-tabs";
import { FavoriteAgents } from "./new-chat/favorite-agents";
import { SearchView } from "./new-chat/search-view";

type Agent = {
  name: string;
  description?: string;
};

type FavoriteAgent = {
  externalId: string;
  name: string;
  description?: string;
};

type Props = {
  agent?: Agent;
  favoriteAgents?: FavoriteAgent[];
};

export function NewChatView({ agent, favoriteAgents = [] }: Props) {
  const { tab, setTab } = useChatTab();

  useHotkeys(
    "tab",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setTab(tab === "ask" ? "search" : "ask");
    },
    {
      preventDefault: true,
      enableOnContentEditable: true,
      enableOnFormTags: true,
      scopes: ["__DEFAULT__"],
    }
  );

  return (
    <div className="relative flex min-h-full grow flex-col pb-8">
      <div className="flex w-full grow flex-col items-center justify-center">
        <div className="z-10 flex w-full max-w-3xl flex-col px-4">
          <AgentHeader agent={agent} />

          <ChatTabs askContent={<AskView />} searchContent={<SearchView />} />
        </div>
      </div>

      <FavoriteAgents favoriteAgents={favoriteAgents} />
    </div>
  );
}
