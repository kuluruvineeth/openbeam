"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useArchiveAgent } from "../hooks/use-archive-agent";
import type { SidebarAgentListEntry } from "../hooks/use-sidebar-agents-list";
import { useSidebarAgentsList } from "../hooks/use-sidebar-agents-list";
import {
  buildDaemonAgentDetailRoute,
  daemonNavigate,
  parseHostAgentRouteFromPathname,
} from "../lib/host-routes";
import { useKeyboardShortcutsStore } from "../stores/keyboard-shortcuts-store";
import { DaemonEmptyState } from "./empty-state";
import { SidebarAgentListSkeleton } from "./sidebar-agent-list-skeleton";
import { SidebarAgentRow } from "./sidebar-agent-row";

interface SidebarProjectSection {
  title: string;
  projectKey: string;
  entries: SidebarAgentListEntry[];
}

function deriveShortcutIndex(
  sidebarShortcutAgentKeys: string[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < sidebarShortcutAgentKeys.length; i++) {
    const key = sidebarShortcutAgentKeys[i];
    if (key) {
      map.set(key, i + 1);
    }
  }
  return map;
}

export function SidebarAgentList({
  serverId,
  onNewAgent,
}: {
  serverId: string;
  onNewAgent: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { entries, isLoading } = useSidebarAgentsList({ serverId });
  const { archiveAgent } = useArchiveAgent();
  const sidebarShortcutAgentKeys = useKeyboardShortcutsStore(
    (s) => s.sidebarShortcutAgentKeys
  );

  const shortcutMap = useMemo(
    () => deriveShortcutIndex(sidebarShortcutAgentKeys),
    [sidebarShortcutAgentKeys]
  );

  const sections = useMemo(() => {
    const byProject = new Map<string, SidebarProjectSection>();
    for (const entry of entries) {
      const key = entry.project.projectKey;
      const existing = byProject.get(key);
      if (existing) {
        existing.entries.push(entry);
      } else {
        byProject.set(key, {
          title: entry.project.projectName,
          projectKey: key,
          entries: [entry],
        });
      }
    }
    return Array.from(byProject.values());
  }, [entries]);

  const agentRouteMatch = useMemo(
    () => parseHostAgentRouteFromPathname(pathname),
    [pathname]
  );

  const selectedAgentKey = agentRouteMatch
    ? `${agentRouteMatch.serverId}:${agentRouteMatch.agentId}`
    : null;

  const handleSelect = useCallback(
    (entry: SidebarAgentListEntry) => {
      const route = buildDaemonAgentDetailRoute(
        entry.agent.serverId,
        entry.agent.id
      );
      const mode = agentRouteMatch ? "replace" : "push";
      daemonNavigate(router, route, mode);
    },
    [agentRouteMatch, router]
  );

  const handleArchive = useCallback(
    (entry: SidebarAgentListEntry) => {
      archiveAgent({
        serverId: entry.agent.serverId,
        agentId: entry.agent.id,
      });
    },
    [archiveAgent]
  );

  if (isLoading) {
    return <SidebarAgentListSkeleton />;
  }

  if (entries.length === 0) {
    return <DaemonEmptyState onNewAgent={onNewAgent} />;
  }

  return (
    <div className="flex-1 overflow-y-auto px-1">
      {sections.map((section) => (
        <SidebarSection
          key={section.projectKey}
          onArchive={handleArchive}
          onSelect={handleSelect}
          section={section}
          selectedAgentKey={selectedAgentKey}
          shortcutMap={shortcutMap}
        />
      ))}
    </div>
  );
}

function SidebarSection({
  section,
  selectedAgentKey,
  shortcutMap,
  onSelect,
  onArchive,
}: {
  section: SidebarProjectSection;
  selectedAgentKey: string | null;
  shortcutMap: Map<string, number>;
  onSelect: (entry: SidebarAgentListEntry) => void;
  onArchive: (entry: SidebarAgentListEntry) => void;
}) {
  return (
    <div className="py-0.5">
      <div className="px-2 py-1 font-medium text-muted-foreground text-xs">
        {section.title}
      </div>
      {section.entries.map((entry) => {
        const agentKey = `${entry.agent.serverId}:${entry.agent.id}`;
        return (
          <SidebarAgentRow
            entry={entry}
            isSelected={agentKey === selectedAgentKey}
            key={agentKey}
            onArchive={onArchive}
            onSelect={onSelect}
            shortcutNumber={shortcutMap.get(agentKey) ?? null}
          />
        );
      })}
    </div>
  );
}
