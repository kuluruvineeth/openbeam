import type {
  MissionAgentLaneState,
  MissionApprovalQueueItem,
  MissionEventLedgerItem,
  MissionTemplate,
} from "@openplane/types/mission-control";

let counter = 0;

function nextId(): string {
  counter += 1;
  return `test-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createMockEvent(
  overrides?: Partial<MissionEventLedgerItem>
): MissionEventLedgerItem {
  return {
    eventId: nextId(),
    missionId: "mission-1",
    runId: "run-1",
    lane: "autonomous",
    sequence: 1,
    eventType: "run.started",
    summary: "Test event",
    timestamp: Date.now(),
    ...overrides,
  };
}

export function createMockAgent(
  overrides?: Partial<MissionAgentLaneState>
): MissionAgentLaneState {
  return {
    agentId: "agent-1",
    agentName: "Research Agent",
    role: "researcher",
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

export function createMockApproval(
  overrides?: Partial<MissionApprovalQueueItem>
): MissionApprovalQueueItem {
  return {
    approvalId: nextId(),
    missionId: "mission-1",
    runId: "run-1",
    agentName: "Research Agent",
    actionIntent: "deploy-changes",
    riskLevel: "medium",
    status: "pending",
    requestedAt: Date.now(),
    ...overrides,
  };
}

export function createMockTemplate(
  overrides?: Partial<MissionTemplate>
): MissionTemplate {
  return {
    id: nextId(),
    name: "Research Mission",
    description: "A standard research mission template",
    vertical: "research",
    agents: [
      {
        name: "Researcher",
        role: "researcher",
        soulPrompt: "You are a thorough researcher.",
        tools: ["search_hybrid", "doc_get"],
      },
    ],
    tasks: [
      {
        title: "Research topic",
        description: "Investigate the given topic",
        priority: "P1",
      },
    ],
    ...overrides,
  };
}

export function createCostEvent(
  agentId: string,
  costCents: number,
  sequence: number
): MissionEventLedgerItem {
  return createMockEvent({
    eventType: "cost.updated",
    sequence,
    summary: `Cost updated for ${agentId}`,
    payload: { agentId, costCents },
  });
}

export function createApprovalRequestEvent(
  approvalId: string,
  agentName: string,
  riskLevel: string,
  sequence: number
): MissionEventLedgerItem {
  return createMockEvent({
    eventType: "approval.requested",
    sequence,
    agentName,
    summary: `Approval requested by ${agentName}`,
    payload: { approvalId, riskLevel, intent: "execute-action" },
  });
}
