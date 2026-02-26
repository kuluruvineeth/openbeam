"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  clearCommandCenterFocusRestoreElement,
  focusWithRetries,
  takeCommandCenterFocusRestoreElement,
} from "../lib/command-center-focus";
import type { ShortcutKey } from "../lib/format-shortcut";
import {
  buildDaemonAgentDetailRoute,
  buildDaemonSettingsRoute,
  daemonNavigate,
  parseHostAgentRouteFromPathname,
  parseServerIdFromPathname,
} from "../lib/host-routes";
import { useKeyboardShortcutsStore } from "../stores/keyboard-shortcuts-store";
import {
  type AggregatedAgent,
  useAggregatedAgents,
} from "./use-aggregated-agents";

function agentKey(agent: Pick<AggregatedAgent, "serverId" | "id">): string {
  return `${agent.serverId}:${agent.id}`;
}

function isMatch(agent: AggregatedAgent, query: string): boolean {
  if (!query) {
    return true;
  }
  const q = query.toLowerCase();
  const title = (agent.title ?? "New agent").toLowerCase();
  const cwd = agent.cwd.toLowerCase();
  const host = agent.serverLabel.toLowerCase();
  return title.includes(q) || cwd.includes(q) || host.includes(q);
}

function sortAgents(left: AggregatedAgent, right: AggregatedAgent): number {
  const leftAttention = left.requiresAttention ? 1 : 0;
  const rightAttention = right.requiresAttention ? 1 : 0;
  if (leftAttention !== rightAttention) {
    return rightAttention - leftAttention;
  }

  const leftRunning = left.status === "running" ? 1 : 0;
  const rightRunning = right.status === "running" ? 1 : 0;
  if (leftRunning !== rightRunning) {
    return rightRunning - leftRunning;
  }

  return (
    (right.lastActivityAt?.getTime() ?? 0) -
    (left.lastActivityAt?.getTime() ?? 0)
  );
}

type CommandCenterActionDefinition = {
  id: string;
  title: string;
  icon?: "plus" | "settings";
  shortcutKeys?: ShortcutKey[];
  keywords: string[];
  buildRoute: (params: {
    newAgentRoute: string;
    settingsRoute: string;
  }) => string;
};

const COMMAND_CENTER_ACTIONS: readonly CommandCenterActionDefinition[] = [
  {
    id: "new-agent",
    title: "New agent",
    icon: "plus",
    shortcutKeys: ["mod", "alt", "N"],
    keywords: ["new", "new agent", "create", "start", "launch", "agent"],
    buildRoute: ({ newAgentRoute }) => newAgentRoute,
  },
  {
    id: "settings",
    title: "Settings",
    icon: "settings",
    keywords: ["settings", "preferences", "config", "configuration"],
    buildRoute: ({ settingsRoute }) => settingsRoute,
  },
];

function matchesActionQuery(
  query: string,
  action: CommandCenterActionDefinition
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  if (action.title.toLowerCase().includes(normalized)) {
    return true;
  }
  return action.keywords.some((keyword) => keyword.includes(normalized));
}

export type CommandCenterActionItem = {
  kind: "action";
  id: string;
  title: string;
  icon?: "plus" | "settings";
  route: string;
  shortcutKeys?: ShortcutKey[];
};

export type CommandCenterItem =
  | {
      kind: "action";
      action: CommandCenterActionItem;
    }
  | {
      kind: "agent";
      agent: AggregatedAgent;
    };

export function useCommandCenter() {
  const pathname = usePathname();
  const router = useRouter();
  const { agents } = useAggregatedAgents();
  const open = useKeyboardShortcutsStore((s) => s.commandCenterOpen);
  const setOpen = useKeyboardShortcutsStore((s) => s.setCommandCenterOpen);
  const requestMessageInputAction = useKeyboardShortcutsStore(
    (s) => s.requestMessageInputAction
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const didNavigateRef = useRef(false);
  const prevOpenRef = useRef(open);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const agentResults = useMemo(() => {
    const filtered = agents.filter((agent) => isMatch(agent, query));
    filtered.sort(sortAgents);
    return filtered;
  }, [agents, query]);

  const fallbackServerId = agents[0]?.serverId ?? null;

  const agentKeyFromPathname = useMemo(() => {
    const match = parseHostAgentRouteFromPathname(pathname);
    if (!match) {
      return null;
    }
    return `${match.serverId}:${match.agentId}`;
  }, [pathname]);

  const newAgentRoute = useMemo(() => {
    const serverIdFromPath =
      parseServerIdFromPathname(pathname) ?? fallbackServerId;
    if (!serverIdFromPath) {
      return "/daemon";
    }
    return `${buildDaemonAgentDetailRoute(serverIdFromPath, "new")}`;
  }, [fallbackServerId, pathname]);

  const settingsRoute = useMemo(() => {
    const serverIdFromPath =
      parseServerIdFromPathname(pathname) ?? fallbackServerId;
    return serverIdFromPath
      ? buildDaemonSettingsRoute(serverIdFromPath)
      : "/daemon";
  }, [fallbackServerId, pathname]);

  const actionItems = useMemo(
    () =>
      COMMAND_CENTER_ACTIONS.filter((action) =>
        matchesActionQuery(query, action)
      ).map<CommandCenterActionItem>((action) => ({
        kind: "action",
        id: action.id,
        title: action.title,
        icon: action.icon,
        route: action.buildRoute({ newAgentRoute, settingsRoute }),
        shortcutKeys: action.shortcutKeys,
      })),
    [newAgentRoute, query, settingsRoute]
  );

  const items = useMemo(() => {
    const next: CommandCenterItem[] = [];
    for (const action of actionItems) {
      next.push({ kind: "action", action });
    }
    for (const agent of agentResults) {
      next.push({ kind: "agent", agent });
    }
    return next;
  }, [actionItems, agentResults]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleSelectAgent = useCallback(
    (agent: AggregatedAgent) => {
      didNavigateRef.current = true;
      requestMessageInputAction({
        agentKey: agentKey(agent),
        kind: "focus",
      });
      clearCommandCenterFocusRestoreElement();
      setOpen(false);

      const mode = parseHostAgentRouteFromPathname(pathname)
        ? "replace"
        : "push";
      const route = buildDaemonAgentDetailRoute(agent.serverId, agent.id);
      daemonNavigate(router, route, mode);
    },
    [pathname, requestMessageInputAction, router, setOpen]
  );

  const handleSelectAction = useCallback(
    (action: CommandCenterActionItem) => {
      didNavigateRef.current = true;
      clearCommandCenterFocusRestoreElement();
      setOpen(false);
      daemonNavigate(router, action.route);
    },
    [router, setOpen]
  );

  const handleSelectItem = useCallback(
    (item: CommandCenterItem) => {
      if (item.kind === "action") {
        handleSelectAction(item.action);
        return;
      }
      handleSelectAgent(item.agent);
    },
    [handleSelectAction, handleSelectAgent]
  );

  useEffect(() => {
    const prevOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!open) {
      setQuery("");
      setActiveIndex(0);

      if (prevOpen && !didNavigateRef.current) {
        const el = takeCommandCenterFocusRestoreElement();
        const isFocused = () =>
          Boolean(el) &&
          typeof document !== "undefined" &&
          document.activeElement === el;

        const cancel = focusWithRetries({
          focus: () => el?.focus(),
          isFocused,
          onTimeout: () => {
            if (agentKeyFromPathname) {
              requestMessageInputAction({
                agentKey: agentKeyFromPathname,
                kind: "focus",
              });
            }
          },
        });
        return cancel;
      }

      return;
    }

    didNavigateRef.current = false;

    const id = setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => clearTimeout(id);
  }, [agentKeyFromPathname, open, requestMessageInputAction]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (activeIndex >= items.length) {
      setActiveIndex(items.length > 0 ? items.length - 1 : 0);
    }
  }, [activeIndex, items.length, open]);

  useHotkeys(
    "escape",
    (event) => {
      event.preventDefault();
      handleClose();
    },
    { enabled: open, enableOnFormTags: true },
    [handleClose]
  );

  useHotkeys(
    "enter",
    (event) => {
      if (items.length === 0) {
        return;
      }
      event.preventDefault();
      const index = Math.max(0, Math.min(activeIndex, items.length - 1));
      const item = items[index];
      if (item) {
        handleSelectItem(item);
      }
    },
    { enabled: open, enableOnFormTags: true },
    [activeIndex, handleSelectItem, items]
  );

  useHotkeys(
    "up, down",
    (event) => {
      if (items.length === 0) {
        return;
      }
      event.preventDefault();
      setActiveIndex((current) => {
        const delta = event.key === "ArrowDown" ? 1 : -1;
        const next = current + delta;
        if (next < 0) {
          return items.length - 1;
        }
        if (next >= items.length) {
          return 0;
        }
        return next;
      });
    },
    { enabled: open, enableOnFormTags: true },
    [items]
  );

  return {
    open,
    inputRef,
    query,
    setQuery,
    activeIndex,
    setActiveIndex,
    items,
    handleClose,
    handleSelectItem,
  };
}
