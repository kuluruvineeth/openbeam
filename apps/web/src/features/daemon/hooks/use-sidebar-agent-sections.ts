"use client";

import { useEffect, useMemo } from "react";
import { groupAgents } from "../lib/agent-grouping";
import {
  sortProjectsByStoredOrder,
  useSectionOrderStore,
} from "../stores/section-order-store";
import type { AggregatedAgent } from "./use-aggregated-agents";

export interface SidebarSectionData {
  key: string;
  projectKey: string;
  title: string;
  agents: AggregatedAgent[];
  firstAgentServerId?: string;
  firstAgentId?: string;
  workingDir?: string;
}

export function useSidebarAgentSections(
  agents: AggregatedAgent[]
): SidebarSectionData[] {
  const projectOrder = useSectionOrderStore((state) => state.projectOrder);
  const setProjectOrder = useSectionOrderStore(
    (state) => state.setProjectOrder
  );

  const { active: activeGroups } = useMemo(
    () => groupAgents(agents, {}),
    [agents]
  );

  const sections: SidebarSectionData[] = useMemo(() => {
    const result: SidebarSectionData[] = [];

    for (const group of activeGroups) {
      const firstAgent = group.agents[0];
      result.push({
        key: `project:${group.key}`,
        projectKey: group.key,
        title: group.name,
        agents: group.agents as AggregatedAgent[],
        firstAgentServerId: firstAgent?.serverId,
        firstAgentId: firstAgent?.id,
        workingDir: firstAgent?.cwd,
      });
    }

    return result;
  }, [activeGroups]);

  const sortedSections = useMemo(
    () => sortProjectsByStoredOrder(sections, projectOrder),
    [sections, projectOrder]
  );

  useEffect(() => {
    const currentKeys = sortedSections.map((s) => s.projectKey);
    const storedKeys = new Set(projectOrder);
    const newKeys = currentKeys.filter((key) => !storedKeys.has(key));

    if (newKeys.length > 0) {
      setProjectOrder([...projectOrder, ...newKeys]);
    }
  }, [projectOrder, sortedSections, setProjectOrder]);

  return sortedSections;
}
