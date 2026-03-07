import type { AgentDirectoryEntry } from "../types";

const ACTIVE_GRACE_PERIOD_MS = 2 * 24 * 60 * 60 * 1000;
const MAX_INACTIVE_PER_PROJECT = 5;

const WORKTREE_PATTERN = /\.openbeam\/worktrees\/([^/]+)\/(.*)/;
const GIT_SUFFIX_PATTERN = /\.git$/;
const HTTP_PREFIX_PATTERN = /^https?:\/\//;
const GIT_PREFIX_PATTERN = /^git@/;
const COLON_PATTERN = /:/;
const REPO_URL_PATTERN = /(?:github\.com|gitlab\.com)[:/]([^/]+\/[^/.]+)/;

export interface ProjectGroup {
  key: string;
  name: string;
  agents: AgentDirectoryEntry[];
}

export interface DateGroup {
  label: string;
  agents: AgentDirectoryEntry[];
}

export interface GroupedAgents {
  active: ProjectGroup[];
  inactive: DateGroup[];
}

export function deriveProjectKey(cwd: string): string {
  const worktreeMatch = cwd.match(WORKTREE_PATTERN);
  if (worktreeMatch) {
    return worktreeMatch[2] ?? cwd;
  }
  return cwd;
}

export function deriveRemoteProjectKey(remoteUrl: string): string {
  const cleaned = remoteUrl
    .replace(GIT_SUFFIX_PATTERN, "")
    .replace(HTTP_PREFIX_PATTERN, "")
    .replace(GIT_PREFIX_PATTERN, "")
    .replace(COLON_PATTERN, "/");
  return cleaned.toLowerCase();
}

export function parseRepoNameFromRemoteUrl(url: string): string | null {
  const match = url.match(REPO_URL_PATTERN);
  return match?.[1] ?? null;
}

export function parseRepoShortNameFromRemoteUrl(url: string): string | null {
  const fullName = parseRepoNameFromRemoteUrl(url);
  if (!fullName) {
    return null;
  }
  const parts = fullName.split("/");
  return parts.at(-1) ?? null;
}

export function deriveProjectName(projectKey: string): string {
  const segments = projectKey.split("/").filter(Boolean);
  return segments.at(-1) ?? projectKey;
}

export function deriveDateGroup(lastActivityAt: Date | null): string {
  if (!lastActivityAt) {
    return "Older";
  }

  const now = new Date();
  const diffMs = now.getTime() - lastActivityAt.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 1) {
    return "Recent";
  }
  if (diffDays < 1) {
    return "Today";
  }

  const isYesterday =
    now.getDate() - lastActivityAt.getDate() === 1 &&
    now.getMonth() === lastActivityAt.getMonth() &&
    now.getFullYear() === lastActivityAt.getFullYear();
  if (isYesterday) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return "This week";
  }
  if (diffDays < 30) {
    return "This month";
  }
  return "Older";
}

function isAgentActive(agent: AgentDirectoryEntry): boolean {
  if (agent.archivedAt) {
    return false;
  }
  if (agent.status === "running" || agent.status === "initializing") {
    return true;
  }

  if (!agent.lastActivityAt) {
    return false;
  }
  const elapsed = Date.now() - agent.lastActivityAt.getTime();
  return elapsed < ACTIVE_GRACE_PERIOD_MS;
}

interface GroupOptions {
  showArchived?: boolean;
}

export function groupAgents(
  agents: AgentDirectoryEntry[],
  options: GroupOptions = {}
): GroupedAgents {
  const { showArchived = false } = options;

  const visible = showArchived ? agents : agents.filter((a) => !a.archivedAt);

  const active: AgentDirectoryEntry[] = [];
  const inactive: AgentDirectoryEntry[] = [];

  for (const agent of visible) {
    if (isAgentActive(agent)) {
      active.push(agent);
    } else {
      inactive.push(agent);
    }
  }

  const projectMap = new Map<string, AgentDirectoryEntry[]>();
  for (const agent of active) {
    const key = deriveProjectKey(agent.cwd);
    const group = projectMap.get(key);
    if (group) {
      group.push(agent);
    } else {
      projectMap.set(key, [agent]);
    }
  }

  const activeGroups: ProjectGroup[] = [];
  for (const [key, projectAgents] of projectMap) {
    activeGroups.push({
      key,
      name: deriveProjectName(key),
      agents: projectAgents.sort(
        (a, b) =>
          (b.lastActivityAt?.getTime() ?? 0) -
          (a.lastActivityAt?.getTime() ?? 0)
      ),
    });
  }

  activeGroups.sort((a, b) => {
    const aLatest = Math.max(
      ...a.agents.map((ag) => ag.lastActivityAt?.getTime() ?? 0)
    );
    const bLatest = Math.max(
      ...b.agents.map((ag) => ag.lastActivityAt?.getTime() ?? 0)
    );
    return bLatest - aLatest;
  });

  const dateMap = new Map<string, AgentDirectoryEntry[]>();
  const sortedInactive = inactive.sort(
    (a, b) =>
      (b.lastActivityAt?.getTime() ?? 0) - (a.lastActivityAt?.getTime() ?? 0)
  );

  const inactiveByProject = new Map<string, number>();

  for (const agent of sortedInactive) {
    const projectKey = deriveProjectKey(agent.cwd);
    const count = inactiveByProject.get(projectKey) ?? 0;
    if (count >= MAX_INACTIVE_PER_PROJECT) {
      continue;
    }
    inactiveByProject.set(projectKey, count + 1);

    const label = deriveDateGroup(agent.lastActivityAt);
    const group = dateMap.get(label);
    if (group) {
      group.push(agent);
    } else {
      dateMap.set(label, [agent]);
    }
  }

  const dateGroupOrder = [
    "Recent",
    "Today",
    "Yesterday",
    "This week",
    "This month",
    "Older",
  ];

  const inactiveGroups: DateGroup[] = [];
  for (const label of dateGroupOrder) {
    const group = dateMap.get(label);
    if (group && group.length > 0) {
      inactiveGroups.push({ label, agents: group });
    }
  }

  return { active: activeGroups, inactive: inactiveGroups };
}
