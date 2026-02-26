import type {
  MissionAgentLaneState,
  MissionEventLedgerItem,
} from "@openplane/types/mission-control";
import type { DashboardLayout } from "@/features/analytics";
import type { PipelineCard } from "@/features/pipeline";

const BUCKET_COUNT = 6;

const STATUS_TO_STAGE: Record<MissionAgentLaneState["status"], string> = {
  idle: "new",
  running: "contacted",
  blocked: "qualified",
  completed: "converted",
  failed: "lost",
};

const STAGE_ORDER = ["new", "contacted", "qualified", "converted", "lost"];

const STAGE_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Lost",
};

const APPROVAL_EVENT_MARKER = "approval";

const WORKSPACE_ACTION_PRESETS = [
  {
    id: "find-leads",
    label: "Find Leads",
    prompt: "Find YC W26 founders building AI companies",
  },
  {
    id: "enrich",
    label: "Enrich Data",
    prompt: "Enrich LinkedIn, company, and education fields for top leads",
  },
  {
    id: "outreach",
    label: "Send Outreach",
    prompt: "Draft personalized outreach and queue next actions",
  },
  {
    id: "analyze",
    label: "Analyze",
    prompt: "Show pipeline breakdown and conversion risk hotspots",
  },
  {
    id: "automate",
    label: "Automate",
    prompt: "Schedule follow-up checks and weekly report automation",
  },
] as const;

type WorkspaceActionPresetId = (typeof WORKSPACE_ACTION_PRESETS)[number]["id"];

type WorkspaceSkillRecommendation = {
  name: string;
  reason: string;
};

type WorkspaceSummary = {
  totalAgents: number;
  activeAgents: number;
  blockedAgents: number;
  completedAgents: number;
  failedAgents: number;
};

const WORKSPACE_PRESET_SKILLS: Record<
  WorkspaceActionPresetId,
  WorkspaceSkillRecommendation[]
> = {
  "find-leads": [
    {
      name: "linkedin-outreach",
      reason: "Prospecting and profile discovery",
    },
    {
      name: "lead-enrichment",
      reason: "Contact and company enrichment",
    },
    {
      name: "crm-automation",
      reason: "Lead routing and pipeline updates",
    },
  ],
  enrich: [
    {
      name: "lead-enrichment",
      reason: "Populate missing lead data",
    },
    {
      name: "crm-automation",
      reason: "Persist normalized enrichment updates",
    },
    {
      name: "agent-browser",
      reason: "Autonomous web research and verification",
    },
  ],
  outreach: [
    {
      name: "linkedin-outreach",
      reason: "Channel-first outbound workflow",
    },
    {
      name: "email-sequences",
      reason: "Automated follow-up orchestration",
    },
    {
      name: "crm-automation",
      reason: "State transitions and campaign logging",
    },
  ],
  analyze: [
    {
      name: "data-analysis",
      reason: "Pipeline and conversion analysis",
    },
    {
      name: "sales-pipeline",
      reason: "Funnel stage tracking and projections",
    },
    {
      name: "lead-enrichment",
      reason: "Improve data quality for analytics",
    },
  ],
  automate: [
    {
      name: "crm-automation",
      reason: "Scheduled workflow execution",
    },
    {
      name: "email-sequences",
      reason: "Automated follow-up cadence",
    },
    {
      name: "agent-browser",
      reason: "Recurring competitor and signal checks",
    },
  ],
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function buildActivityBuckets(events: MissionEventLedgerItem[]) {
  const buckets = Array.from({ length: BUCKET_COUNT }, (_, index) => ({
    period: `W${index + 1}`,
    events: 0,
    approvals: 0,
  }));

  if (events.length === 0) {
    return buckets;
  }

  const sortedEvents = [...events].sort(
    (a, b) => a.timestamp - b.timestamp || a.sequence - b.sequence
  );
  const start = sortedEvents[0]?.timestamp ?? Date.now();
  const end = sortedEvents.at(-1)?.timestamp ?? start;
  const span = Math.max(end - start, BUCKET_COUNT);
  const bucketWidth = Math.max(Math.ceil(span / BUCKET_COUNT), 1);

  for (const event of sortedEvents) {
    const bucketIndex = Math.min(
      BUCKET_COUNT - 1,
      Math.floor((event.timestamp - start) / bucketWidth)
    );
    const bucket = buckets[bucketIndex];
    if (!bucket) {
      continue;
    }

    bucket.events += 1;
    if (event.eventType.includes(APPROVAL_EVENT_MARKER)) {
      bucket.approvals += 1;
    }
  }

  return buckets;
}

function countAgentsByStage(agentBoard: Record<string, MissionAgentLaneState>) {
  const counts = new Map<string, number>(
    STAGE_ORDER.map((stage) => [stage, 0])
  );

  for (const agent of Object.values(agentBoard)) {
    const stage = STATUS_TO_STAGE[agent.status];
    const currentCount = counts.get(stage) ?? 0;
    counts.set(stage, currentCount + 1);
  }

  return STAGE_ORDER.map((stage) => ({
    stage: STAGE_LABEL[stage] ?? stage,
    count: counts.get(stage) ?? 0,
  }));
}

export function summarizeWorkspace(
  agentBoard: Record<string, MissionAgentLaneState>
): WorkspaceSummary {
  const agents = Object.values(agentBoard);

  return {
    totalAgents: agents.length,
    activeAgents: agents.filter((agent) => agent.status === "running").length,
    blockedAgents: agents.filter((agent) => agent.status === "blocked").length,
    completedAgents: agents.filter((agent) => agent.status === "completed")
      .length,
    failedAgents: agents.filter((agent) => agent.status === "failed").length,
  };
}

export function getWorkspacePrompt(presetId: WorkspaceActionPresetId): string {
  return (
    WORKSPACE_ACTION_PRESETS.find((preset) => preset.id === presetId)?.prompt ??
    WORKSPACE_ACTION_PRESETS[0].prompt
  );
}

export function getWorkspaceSkillRecommendations(
  presetId: WorkspaceActionPresetId
): WorkspaceSkillRecommendation[] {
  return WORKSPACE_PRESET_SKILLS[presetId] ?? [];
}

export function buildWorkspaceSkillInstallHref(
  missionId: string,
  skillName: string
): string {
  const params = new URLSearchParams({
    tab: "skills",
    skillCategory: "all",
    missionId,
    installSkill: skillName,
  });

  return `/connectors?${params.toString()}`;
}

export function buildWorkspacePipelineCards(
  agentBoard: Record<string, MissionAgentLaneState>
): PipelineCard[] {
  const nowIso = new Date().toISOString();

  return Object.values(agentBoard)
    .sort(
      (a, b) =>
        (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0) ||
        a.agentName.localeCompare(b.agentName)
    )
    .map((agent) => {
      const updatedAt = agent.lastActivityAt
        ? new Date(agent.lastActivityAt).toISOString()
        : nowIso;
      return {
        id: agent.agentId,
        title: agent.agentName,
        columnId: STATUS_TO_STAGE[agent.status],
        fields: [
          {
            name: "Role",
            value: agent.role || "Generalist",
            type: "text" as const,
          },
          {
            name: "Task",
            value: agent.currentTaskTitle || "No active task",
            type: "text" as const,
          },
          {
            name: "Cost",
            value: formatCents(agent.costCents),
            type: "text" as const,
          },
        ],
        tags: [agent.status, agent.timeoutTier ? "timed" : "live"],
        assigneeId: agent.agentId,
        assigneeName: agent.agentName,
        createdAt: updatedAt,
        updatedAt,
      };
    });
}

export function buildWorkspaceDashboardLayout(
  agentBoard: Record<string, MissionAgentLaneState>,
  events: MissionEventLedgerItem[]
): DashboardLayout {
  const stageCounts = countAgentsByStage(agentBoard);
  const totalAgents = Object.keys(agentBoard).length;
  const activityData = buildActivityBuckets(events);

  return {
    id: "mission-workspace-analytics",
    title: `Mission analytics (${totalAgents} agents)`,
    panels: [
      {
        id: "activity",
        type: "line",
        config: {
          title: "Execution Activity",
          xField: "period",
          yFields: ["events", "approvals"],
          colors: ["#3b82f6", "#14b8a6"],
          showGrid: true,
        },
        data: activityData,
        gridColumn: "1 / span 2",
      },
      {
        id: "breakdown",
        type: "donut",
        config: {
          title: "Pipeline Breakdown",
          nameKey: "stage",
          valueKey: "count",
          colors: ["#94a3b8", "#3b82f6", "#22c55e", "#6366f1", "#ef4444"],
        },
        data: stageCounts,
      },
      {
        id: "funnel",
        type: "funnel",
        config: {
          title: "Conversion Funnel",
          nameKey: "stage",
          valueKey: "count",
          colors: ["#94a3b8", "#3b82f6", "#22c55e", "#6366f1", "#ef4444"],
        },
        data: stageCounts,
      },
    ],
  };
}

export { WORKSPACE_ACTION_PRESETS };
export type {
  WorkspaceActionPresetId,
  WorkspaceSkillRecommendation,
  WorkspaceSummary,
};
