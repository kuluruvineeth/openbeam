import type { MissionAgentLaneState } from "@openplane/types/mission-control";
import { sortAgentsForDisplay } from "./agent-display-order";

export type SpecialistGroupKey =
  | "running"
  | "reflecting"
  | "blocked"
  | "spawned"
  | "done";

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

const GROUP_ORDER: SpecialistGroupKey[] = [
  "running",
  "reflecting",
  "blocked",
  "spawned",
  "done",
];

const GROUP_META: Record<
  SpecialistGroupKey,
  { label: string; description: string }
> = {
  running: {
    label: "Running",
    description: "Actively executing tasks",
  },
  reflecting: {
    label: "Reflecting",
    description: "Evaluating progress",
  },
  blocked: {
    label: "Blocked",
    description: "Waiting on approvals or recovery",
  },
  spawned: {
    label: "Spawned",
    description: "Dynamically created agents",
  },
  done: {
    label: "Done",
    description: "Completed or idle specialists",
  },
};

function resolveSpecialistGroup(
  agent: MissionAgentLaneState
): SpecialistGroupKey {
  if (agent.isReflecting) {
    return "reflecting";
  }

  if (agent.status === "running") {
    return agent.spawnedBy ? "spawned" : "running";
  }

  if (agent.status === "blocked" || agent.status === "failed") {
    return "blocked";
  }

  if (
    agent.spawnedBy &&
    (agent.status === "idle" || agent.status === "completed")
  ) {
    return "spawned";
  }

  return "done";
}

export function buildSpecialistSections(
  agents: MissionAgentLaneState[]
): SpecialistSection[] {
  const grouped: Record<SpecialistGroupKey, MissionAgentLaneState[]> = {
    running: [],
    reflecting: [],
    blocked: [],
    spawned: [],
    done: [],
  };

  for (const agent of agents) {
    grouped[resolveSpecialistGroup(agent)].push(agent);
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
