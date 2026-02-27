import { describe, expect, it } from "bun:test";
import type {
  MissionAgentLaneState,
  MissionEventLedgerItem,
} from "@openplane/types/mission-control";
import {
  buildWorkspaceDashboardLayout,
  buildWorkspacePipelineCards,
  buildWorkspaceSkillInstallHref,
  getWorkspacePrompt,
  getWorkspaceSkillRecommendations,
  summarizeWorkspace,
} from "../mission-workspace";

function createAgent(
  overrides: Partial<MissionAgentLaneState>
): MissionAgentLaneState {
  return {
    agentId: "agent-default",
    agentName: "Agent Default",
    role: "generalist",
    status: "idle",
    stepsCompleted: 0,
    tokensUsed: 0,
    costCents: 0,
    recentToolCalls: [],
    replanCount: 0,
    isReflecting: false,
    spawnDepth: 0,
    crossMissionLinks: [],
    ...overrides,
  };
}

function createEvent(
  overrides: Partial<MissionEventLedgerItem>
): MissionEventLedgerItem {
  return {
    eventId: "evt-default",
    missionId: "mission-1",
    runId: "run-1",
    lane: "autonomous",
    sequence: 1,
    eventType: "run.started",
    summary: "event",
    timestamp: 1_700_000_000_000,
    ...overrides,
  };
}

describe("mission-workspace", () => {
  it("maps agent statuses into pipeline stages", () => {
    const board: Record<string, MissionAgentLaneState> = {
      a: createAgent({
        agentId: "a",
        agentName: "Alpha",
        status: "idle",
        lastActivityAt: 1000,
      }),
      b: createAgent({
        agentId: "b",
        agentName: "Beta",
        status: "running",
        lastActivityAt: 2000,
      }),
      c: createAgent({
        agentId: "c",
        agentName: "Gamma",
        status: "blocked",
        lastActivityAt: 3000,
      }),
      d: createAgent({
        agentId: "d",
        agentName: "Delta",
        status: "completed",
        lastActivityAt: 4000,
      }),
      e: createAgent({
        agentId: "e",
        agentName: "Epsilon",
        status: "failed",
        lastActivityAt: 5000,
      }),
    };

    const cards = buildWorkspacePipelineCards(board);
    const byId = new Map(cards.map((card) => [card.id, card]));

    expect(byId.get("a")?.columnId).toBe("new");
    expect(byId.get("b")?.columnId).toBe("contacted");
    expect(byId.get("c")?.columnId).toBe("qualified");
    expect(byId.get("d")?.columnId).toBe("converted");
    expect(byId.get("e")?.columnId).toBe("lost");
    expect(cards[0]?.id).toBe("e");
  });

  it("builds analytics layout with consistent stage and activity counts", () => {
    const board: Record<string, MissionAgentLaneState> = {
      a: createAgent({ agentId: "a", status: "idle" }),
      b: createAgent({ agentId: "b", status: "running" }),
      c: createAgent({ agentId: "c", status: "running" }),
      d: createAgent({ agentId: "d", status: "blocked" }),
      e: createAgent({ agentId: "e", status: "completed" }),
      f: createAgent({ agentId: "f", status: "failed" }),
    };

    const events: MissionEventLedgerItem[] = [
      createEvent({
        eventId: "evt-1",
        sequence: 1,
        eventType: "run.started",
        timestamp: 1_700_000_000_000,
      }),
      createEvent({
        eventId: "evt-2",
        sequence: 2,
        eventType: "approval.requested",
        timestamp: 1_700_000_060_000,
      }),
      createEvent({
        eventId: "evt-3",
        sequence: 3,
        eventType: "run.completed",
        timestamp: 1_700_000_120_000,
      }),
    ];

    const layout = buildWorkspaceDashboardLayout(board, events);
    const breakdown = layout.panels.find((panel) => panel.id === "breakdown");
    const activity = layout.panels.find((panel) => panel.id === "activity");

    const breakdownData = (breakdown?.data ?? []) as Array<{
      stage: string;
      count: number;
    }>;
    const stageCount = new Map(
      breakdownData.map((row) => [row.stage, row.count] as const)
    );
    expect(stageCount.get("New")).toBe(1);
    expect(stageCount.get("Contacted")).toBe(2);
    expect(stageCount.get("Qualified")).toBe(1);
    expect(stageCount.get("Converted")).toBe(1);
    expect(stageCount.get("Lost")).toBe(1);

    const activityData = (activity?.data ?? []) as Array<{
      events: number;
      approvals: number;
    }>;
    expect(activityData).toHaveLength(6);
    expect(activityData.reduce((sum, row) => sum + row.events, 0)).toBe(3);
    expect(activityData.reduce((sum, row) => sum + row.approvals, 0)).toBe(1);
  });

  it("returns stable prompts for workspace presets", () => {
    expect(getWorkspacePrompt("find-leads")).toContain("YC W26");
    expect(getWorkspacePrompt("automate")).toContain("automation");
  });

  it("returns deterministic skill recommendations for each preset", () => {
    const recommendations = getWorkspaceSkillRecommendations("find-leads");

    expect(recommendations).toHaveLength(3);
    expect(
      recommendations.some((skill) => skill.name === "linkedin-outreach")
    ).toBe(true);
  });

  it("builds a mission-scoped install link for connectors skills tab", () => {
    const href = buildWorkspaceSkillInstallHref(
      "mission-42",
      "lead-enrichment"
    );
    const [, query = ""] = href.split("?");
    const params = new URLSearchParams(query);

    expect(href.startsWith("/connectors?")).toBe(true);
    expect(params.get("tab")).toBe("skills");
    expect(params.get("skillCategory")).toBe("all");
    expect(params.get("missionId")).toBe("mission-42");
    expect(params.get("installSkill")).toBe("lead-enrichment");
  });

  it("summarizes runtime counts for workspace stat chips", () => {
    const board: Record<string, MissionAgentLaneState> = {
      a: createAgent({ agentId: "a", status: "running" }),
      b: createAgent({ agentId: "b", status: "running" }),
      c: createAgent({ agentId: "c", status: "blocked" }),
      d: createAgent({ agentId: "d", status: "completed" }),
      e: createAgent({ agentId: "e", status: "failed" }),
    };

    const summary = summarizeWorkspace(board);
    expect(summary.totalAgents).toBe(5);
    expect(summary.activeAgents).toBe(2);
    expect(summary.blockedAgents).toBe(1);
    expect(summary.completedAgents).toBe(1);
    expect(summary.failedAgents).toBe(1);
  });
});
