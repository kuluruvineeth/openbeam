"use client";

import { useQueryStates } from "nuqs";
import { createLoader, parseAsStringLiteral } from "nuqs/server";

export const chatTabOptions = ["ask", "search"] as const;

export const chatTabSchema = {
  tab: parseAsStringLiteral(chatTabOptions).withDefault("ask"),
};

export function useChatTab() {
  const [params, setParams] = useQueryStates(chatTabSchema);

  return {
    tab: params.tab,
    setTab: (tab: (typeof chatTabOptions)[number]) => {
      setParams({ tab });
    },
  };
}

export const loadChatTab = createLoader(chatTabSchema);
