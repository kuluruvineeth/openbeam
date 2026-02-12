import type { MissionAgentLaneState } from "@openplane/types/mission-control";
import { sortAgentsForDisplay } from "./agent-display-order";

export type SpecialistGroupKey = "running" | "blocked" | "done";

export type SpecialistSection = {
  key: SpecialistGroupKey;
  label: string;
  description: string;
  agents: MissionAgentLaneState[];
};

export type AgentTreePartition = {
  leads: MissionAgentLaneState[];
  specialists: MissionAgentLaneState[];
};

const GROUP_ORDER: SpecialistGroupKey[] = ["running", "blocked", "done"];

const GROUP_META: Record<
  SpecialistGroupKey,
  { label: string; description: string }
> = {
  running: {
    label: "Running",
    description: "Actively executing tasks",
  },
  blocked: {
    label: "Blocked",
    description: "Waiting on approvals or recovery",
  },
  done: {
    label: "Done",
    description: "Completed or idle specialists",
  },
};

function resolveSpecialistGroup(
  status: MissionAgentLaneState["status"]
): SpecialistGroupKey {
  if (status === "running") {
    return "running";
  }

  if (status === "blocked" || status === "failed") {
    return "blocked";
  }

  return "done";
}

export function buildSpecialistSections(
  agents: MissionAgentLaneState[]
): SpecialistSection[] {
  const grouped: Record<SpecialistGroupKey, MissionAgentLaneState[]> = {
    running: [],
    blocked: [],
    done: [],
  };

  for (const agent of agents) {
    grouped[resolveSpecialistGroup(agent.status)].push(agent);
  }

  return GROUP_ORDER.map((key) => ({
    key,
    label: GROUP_META[key].label,
    description: GROUP_META[key].description,
    agents: grouped[key],
  }));
}

export function partitionAgentsForTree(
  agents: MissionAgentLaneState[]
): AgentTreePartition {
  const leads: MissionAgentLaneState[] = [];
  const specialists: MissionAgentLaneState[] = [];

  for (const agent of agents) {
    if (agent.role.trim().toLowerCase() === "coordinator") {
      leads.push(agent);
      continue;
    }
    specialists.push(agent);
  }

  return {
    leads: sortAgentsForDisplay(leads),
    specialists: sortAgentsForDisplay(specialists),
  };
}
