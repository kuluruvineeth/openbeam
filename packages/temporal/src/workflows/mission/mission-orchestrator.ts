import type { CrossMissionSignalPayload } from "@openplane/types/temporal/cross-mission";
import type { AgentCompletedPayload } from "@openplane/types/temporal/mission";
import {
  type AgentClaimTaskSignalPayload,
  HISTORY_EVENT_THRESHOLD,
  MissionOrchestratorInputSchema,
  type MissionOrchestratorOutput,
  type ReviewAssignment,
  type ReviewGatingConfig,
  SHARD_THRESHOLD,
  type SpawnAgentSignalPayload,
  SpawnLimitsSchema,
} from "@openplane/types/temporal/mission";
import {
  type AgentMessageEnvelope,
  BROADCAST_RECIPIENT,
} from "@openplane/types/temporal/mission-messaging";
import type {
  DependencyFailurePayload,
  MissionHealthSnapshot,
  ReviewConsensus,
  StandupReport,
} from "@openplane/types/temporal/mission-reflection";
import { StandupReportSchema } from "@openplane/types/temporal/mission-reflection";
import type { Duration } from "@temporalio/common";
import {
  condition,
  continueAsNew,
  getExternalWorkflowHandle,
  patched,
  proxyActivities,
  setHandler,
  startChild,
  workflowInfo,
} from "@temporalio/workflow";
import type { ReflectionActivities } from "../../activities/mission/reflection-types";
import type { MissionActivities } from "../../activities/mission/types";
import {
  agentClaimTaskSignal,
  agentCompletedSignal,
  agentInboxDeliverySignal,
  agentMessageRouteSignal,
  crossMissionPendingDelegationsQuery,
  crossMissionSignal,
  dependencyFailureSignal,
  healthUpdateSignal,
  missionCommandSignal,
  missionHealthQuery,
  missionRuntimeQuery,
  missionWakeSignal,
  peerReviewConsensusSignal,
  type ShardDispatchPayload,
  shardDispatchSignal,
  shardMessageRouteSignal,
  spawnAgentSignal,
} from "../types";

const MAX_SPAWNS_PER_ITERATION = 5;
const MAX_CLAIMS_PER_ITERATION = 20;
const MAX_REVIEWS_PER_ITERATION = 5;
function toDuration(value: string): Duration {
  return value as Duration;
}

const activities = proxyActivities<MissionActivities>({
  startToCloseTimeout: "2m",
  retry: {
    maximumAttempts: 3,
    initialInterval: "1s",
    backoffCoefficient: 2,
  },
});

const reflectionActivities = proxyActivities<ReflectionActivities>({
  startToCloseTimeout: toDuration("3m"),
  heartbeatTimeout: toDuration("1m"),
  retry: {
    maximumAttempts: 2,
    initialInterval: "2s",
    backoffCoefficient: 2,
  },
});

type OrchestratorStatus =
  | "idle"
  | "dispatching"
  | "paused"
  | "cancelled"
  | "completed";

interface RunningAgent {
  agentId: string;
  childWorkflowId: string;
  agentName: string;
}

interface OrchestratorState {
  status: OrchestratorStatus;
  dispatchedRuns: number;
  completedTasks: number;
  consumedCents: number;
  spawnedAgentCount: number;
  lastDispatchAt: number | undefined;
  queueDepth: number;
  runningAgents: number;
  wakeQueue: Array<{ reason: string; metadata?: Record<string, unknown> }>;
  spawnQueue: SpawnAgentSignalPayload[];
  claimQueue: AgentClaimTaskSignalPayload[];
  crossMissionEvents: CrossMissionSignalPayload[];
  pendingDelegations: Array<{
    requestId: string;
    taskTitle: string;
    sourceMissionId: string;
  }>;
  missionHealthSnapshot: MissionHealthSnapshot | null;
  healthSnapshotProcessedAt: number | undefined;
  pendingDependencyFailures: DependencyFailurePayload[];
  reviewConsensusQueue: Array<{
    taskId: string;
    consensus: ReviewConsensus;
  }>;
  activeAgents: Map<string, RunningAgent>;
  pendingMessages: AgentMessageEnvelope[];
  lastStandupAt: number | undefined;
  standupRoundCount: number;
  shardMap: Map<string, string>;
  activeShards: Map<string, number>;
  shardCounter: number;
  spawnTree: Map<string, string>;
}

export function wouldCreateCycle(
  spawnTree: Map<string, string>,
  parentId: string,
  proposedChildId: string
): boolean {
  let current = parentId;
  const visited = new Set<string>();
  while (current) {
    if (current === proposedChildId) {
      return true;
    }
    if (visited.has(current)) {
      return true;
    }
    visited.add(current);
    const next = spawnTree.get(current);
    if (!next) {
      break;
    }
    current = next;
  }
  return false;
}

async function processSpawnRequests(
  input: {
    missionId: string;
    budgetCents?: number;
    spawnLimits?: unknown;
  },
  state: OrchestratorState
): Promise<void> {
  if (state.spawnQueue.length === 0) {
    return;
  }

  const limits = SpawnLimitsSchema.parse(input.spawnLimits ?? {});
  let processed = 0;

  while (state.spawnQueue.length > 0 && processed < MAX_SPAWNS_PER_ITERATION) {
    if (state.activeAgents.size >= limits.maxConcurrentSpawned) {
      break;
    }

    const payload = state.spawnQueue.shift();
    if (!payload) {
      continue;
    }

    const validation = await activities.validateSpawnRequest({
      missionId: input.missionId,
      requestId: payload.requestId,
      request: payload.request,
      currentSpawnedAgentCount: state.spawnedAgentCount,
      spawnLimits: limits,
      consumedCents: state.consumedCents,
      budgetCents: input.budgetCents,
    });

    if (!validation.approved) {
      await activities.logActivity({
        missionId: input.missionId,
        type: "agent_spawn_denied",
        message: validation.reason,
        agentId: payload.request.requestingAgentId,
        metadata: {
          requestId: payload.requestId,
          requiredCapabilities: payload.request.requiredCapabilities,
          taskDescription: payload.request.taskDescription,
          reason: validation.reason,
        },
      });
      processed += 1;
      continue;
    }

    const generated = await activities.generateSpawnedSoulPrompt({
      missionId: input.missionId,
      requestId: payload.requestId,
      request: payload.request,
    });

    const blueprint = {
      ...generated.blueprint,
      maxSteps: validation.adjustedMaxSteps ?? generated.blueprint.maxSteps,
      budgetCentsLimit:
        validation.adjustedBudgetCents ?? generated.blueprint.budgetCentsLimit,
    };

    const created = await activities.createSpawnedAgent({
      missionId: input.missionId,
      requestId: payload.requestId,
      request: payload.request,
      blueprint,
    });

    if (
      wouldCreateCycle(
        state.spawnTree,
        payload.request.requestingAgentId,
        created.missionAgentId
      )
    ) {
      await activities.logActivity({
        missionId: input.missionId,
        type: "agent_spawn_denied",
        message: `Spawn cycle detected: ${created.missionAgentId} would create a cycle from ${payload.request.requestingAgentId}`,
        agentId: payload.request.requestingAgentId,
        metadata: {
          requestId: payload.requestId,
          reason: "spawn_cycle_detected",
          parentAgentId: payload.request.requestingAgentId,
          proposedChildId: created.missionAgentId,
        },
      });
      processed += 1;
      continue;
    }

    state.spawnTree.set(
      created.missionAgentId,
      payload.request.requestingAgentId
    );
    state.spawnedAgentCount += 1;

    await activities.logActivity({
      missionId: input.missionId,
      type: "agent_spawned",
      message: `Spawned specialist "${blueprint.name}" for delegated work`,
      agentId: payload.request.requestingAgentId,
      metadata: {
        requestId: payload.requestId,
        parentAgentId: payload.request.requestingAgentId,
        spawnedAgentId: created.missionAgentId,
        taskId: created.taskId,
        capabilities: blueprint.capabilities,
        tools: blueprint.tools,
        maxSteps: blueprint.maxSteps,
        budgetCentsLimit: blueprint.budgetCentsLimit,
      },
    });

    processed += 1;
  }

  if (state.spawnQueue.length > 0) {
    state.wakeQueue.push({ reason: "spawn_backpressure" });
  }
}

async function processAgentClaims(
  input: {
    missionId: string;
    maxConcurrentRuns: number;
    budgetCents?: number;
  },
  state: OrchestratorState
): Promise<void> {
  let processed = 0;

  while (state.claimQueue.length > 0 && processed < MAX_CLAIMS_PER_ITERATION) {
    const claim = state.claimQueue.shift();
    if (!claim) {
      continue;
    }

    const validation = await activities.validateAgentClaim({
      missionId: input.missionId,
      agentId: claim.agentId,
      taskId: claim.taskId,
      currentRunningAgents: state.activeAgents.size,
      maxConcurrentRuns: input.maxConcurrentRuns,
      consumedCents: state.consumedCents,
      budgetCents: input.budgetCents,
    });

    if (!validation.approved) {
      await activities.logActivity({
        missionId: input.missionId,
        type: "agent_claim_rejected",
        message: `Claim rejected for agent ${claim.agentId}: ${validation.reason}`,
        agentId: claim.agentId,
        metadata: {
          claimId: claim.claimId,
          taskId: claim.taskId,
          reason: validation.reason,
        },
      });
      processed += 1;
      continue;
    }

    const claimed = await activities.claimTask({
      taskId: claim.taskId,
      agentId: claim.agentId,
    });

    if (!claimed.claimed) {
      await activities.logActivity({
        missionId: input.missionId,
        type: "agent_claim_rejected",
        message: `Claim rejected for agent ${claim.agentId}: task already taken`,
        agentId: claim.agentId,
        metadata: {
          claimId: claim.claimId,
          taskId: claim.taskId,
          reason: "Task already claimed by another agent",
        },
      });
      processed += 1;
      continue;
    }

    await activities.logActivity({
      missionId: input.missionId,
      type: "task_self_claimed",
      message: `Agent ${claim.agentId} self-claimed task ${claim.taskId}`,
      agentId: claim.agentId,
      metadata: {
        claimId: claim.claimId,
        taskId: claim.taskId,
        justification: claim.justification,
      },
    });

    state.wakeQueue.push({
      reason: "task",
      metadata: {
        claimId: claim.claimId,
        taskId: claim.taskId,
        agentId: claim.agentId,
      },
    });

    processed += 1;
  }

  if (state.claimQueue.length > 0) {
    state.wakeQueue.push({ reason: "claim_backpressure" });
  }
}

async function processReviewConsensus(
  input: { missionId: string },
  state: OrchestratorState
): Promise<void> {
  let processed = 0;

  while (
    state.reviewConsensusQueue.length > 0 &&
    processed < MAX_REVIEWS_PER_ITERATION
  ) {
    const entry = state.reviewConsensusQueue.shift();
    if (!entry) {
      continue;
    }

    const { taskId, consensus } = entry;

    if (consensus.finalVerdict === "approve") {
      await activities.completeTask({
        taskId,
        agentId: "system",
      });

      await activities.logActivity({
        missionId: input.missionId,
        type: "peer_review_consensus",
        message: `Task ${taskId} approved by peer review (score: ${consensus.averageQualityScore.toFixed(2)})`,
        metadata: {
          taskId,
          verdict: consensus.finalVerdict,
          averageQualityScore: consensus.averageQualityScore,
          unanimousApproval: consensus.unanimousApproval,
          reviewCount: consensus.reviews.length,
        },
      });
      processed += 1;
      continue;
    }

    if (consensus.finalVerdict === "revise") {
      const revisionFeedback = consensus.reviews
        .filter((r) => r.verdict === "revise" || r.issues.length > 0)
        .map((r) => {
          const issueList = r.issues
            .map((i) => `[${i.severity}] ${i.description}`)
            .join("; ");
          const suggestion = r.suggestion ? ` — ${r.suggestion}` : "";
          return `${r.reviewerAgentName}: ${issueList}${suggestion}`;
        })
        .join("\n");

      await activities.sendFeedback({
        taskId,
        fromAgentId: "system",
        feedback: revisionFeedback || consensus.reasoning,
        reopen: true,
      });

      await activities.logActivity({
        missionId: input.missionId,
        type: "peer_review_consensus",
        message: `Task ${taskId} requires revision per peer review (score: ${consensus.averageQualityScore.toFixed(2)})`,
        metadata: {
          taskId,
          verdict: consensus.finalVerdict,
          averageQualityScore: consensus.averageQualityScore,
          reviewCount: consensus.reviews.length,
        },
      });
      processed += 1;
      continue;
    }

    const rejectReasons = consensus.reviews
      .filter((r) => r.verdict === "reject")
      .map(
        (r) =>
          `Rejected by ${r.reviewerAgentName}: ${r.issues.map((i) => i.description).join(", ")}`
      );

    await reflectionActivities.escalate({
      missionId: input.missionId,
      taskId,
      agentId: "system",
      reason: `Peer review rejected: ${consensus.reasoning}`,
      reflectionBuffer: [],
      attemptedApproaches: rejectReasons,
      suggestedNextSteps: [
        "Reassign task to a different agent",
        "Break task into smaller subtasks",
      ],
    });

    await activities.logActivity({
      missionId: input.missionId,
      type: "peer_review_consensus",
      message: `Task ${taskId} rejected by peer review — escalating (score: ${consensus.averageQualityScore.toFixed(2)})`,
      metadata: {
        taskId,
        verdict: consensus.finalVerdict,
        averageQualityScore: consensus.averageQualityScore,
        hasVeto: consensus.hasVeto,
        reviewCount: consensus.reviews.length,
      },
    });

    processed += 1;
  }

  if (state.reviewConsensusQueue.length > 0) {
    state.wakeQueue.push({ reason: "review_backpressure" });
  }
}

async function refreshReviewQueue(
  input: { missionId: string; reviewGating?: ReviewGatingConfig },
  state: OrchestratorState
): Promise<void> {
  if (!input.reviewGating || input.reviewGating.policy === "none") {
    return;
  }

  const queue = await activities.refreshQueue({
    missionId: input.missionId,
  });

  const now = workflowInfo().unsafe.now();
  const timeoutMs = input.reviewGating.reviewTimeoutMin * 60_000;

  for (const task of queue.tasks) {
    const assignmentKey = `review_assignment:${task.id}`;
    const existing = await activities.readMemory({
      missionId: input.missionId,
      key: assignmentKey,
      scope: "mission",
    });

    if (existing) {
      const assignment = existing as ReviewAssignment;
      if (assignment.status === "pending" && now > assignment.dueAt) {
        await activities.writeMemory({
          missionId: input.missionId,
          key: assignmentKey,
          value: { ...assignment, status: "expired" },
          scope: "mission",
        });

        await activities.logActivity({
          missionId: input.missionId,
          type: "review_timeout",
          message: `Review timeout for "${task.title}" — auto-advancing`,
          metadata: {
            taskId: task.id,
            reviewerAgentId: assignment.reviewerAgentId,
          },
        });
      }
      continue;
    }

    if (!input.reviewGating.autoAssign) {
      continue;
    }

    try {
      const reviewer = await activities.selectReviewer({
        missionId: input.missionId,
        taskId: task.id,
        authorAgentId: task.assigneeId ?? "",
        requiredCapabilities: task.requiredCapabilities,
      });

      const assignment: ReviewAssignment = {
        taskId: task.id,
        reviewerAgentId: reviewer.reviewerAgentId,
        reviewerAgentName: reviewer.reviewerAgentName,
        assignedAt: now,
        dueAt: now + timeoutMs,
        status: "pending",
      };

      await activities.writeMemory({
        missionId: input.missionId,
        key: assignmentKey,
        value: assignment,
        scope: "mission",
      });

      const target = state.activeAgents.get(reviewer.reviewerAgentId);
      if (target) {
        const envelope: AgentMessageEnvelope = {
          message: {
            id: `review-req-${task.id}`,
            missionId: input.missionId,
            senderId: "orchestrator",
            senderName: "Mission Control",
            recipientId: reviewer.reviewerAgentId,
            kind: "request",
            priority: "high",
            subject: "peer_review_assignment",
            body: {
              taskId: task.id,
              taskTitle: task.title,
              authorAgentId: task.assigneeId,
              dueAt: assignment.dueAt,
            },
            createdAt: now,
          },
        };
        await signalAgentInbox(target.childWorkflowId, envelope);
      }

      await activities.logActivity({
        missionId: input.missionId,
        type: "reviewer_assigned",
        message: `${reviewer.reviewerAgentName} assigned to review "${task.title}"`,
        agentId: reviewer.reviewerAgentId,
        metadata: {
          taskId: task.id,
          reviewerAgentId: reviewer.reviewerAgentId,
          matchScore: reviewer.matchScore,
          dueAt: assignment.dueAt,
        },
      });
    } catch {
      await activities.logActivity({
        missionId: input.missionId,
        type: "reviewer_assignment_failed",
        message: `No available reviewer for task "${task.title}"`,
        metadata: { taskId: task.id },
      });
    }
  }
}

function formatDelegationDescription(payload: {
  taskDescription: string;
  sourceMissionId: string;
  requestId: string;
  context?: Record<string, unknown>;
}): string {
  const contextBlock =
    payload.context && Object.keys(payload.context).length > 0
      ? `\n\nContext:\n${JSON.stringify(payload.context)}`
      : "";

  return `Delegated from mission ${payload.sourceMissionId}.\nRequest ID: ${payload.requestId}.\n\n${payload.taskDescription}${contextBlock}`;
}

async function processCrossMissionEvents(
  input: {
    missionId: string;
    teamId: string;
  },
  state: OrchestratorState
): Promise<void> {
  while (state.crossMissionEvents.length > 0) {
    const event = state.crossMissionEvents.shift();
    if (!event) {
      continue;
    }

    if (event.type === "delegation_request") {
      const delegation = event.delegation;
      if (delegation.sourceTeamId !== input.teamId) {
        continue;
      }

      const existing = state.pendingDelegations.some(
        (pending) => pending.requestId === delegation.requestId
      );
      if (!existing) {
        state.pendingDelegations.push({
          requestId: delegation.requestId,
          taskTitle: delegation.taskTitle,
          sourceMissionId: delegation.sourceMissionId,
        });
      }

      await activities.createMissionTask({
        missionId: input.missionId,
        agentId: "system",
        title: `[Delegated] ${delegation.taskTitle}`.slice(0, 180),
        description: formatDelegationDescription({
          taskDescription: delegation.taskDescription,
          sourceMissionId: delegation.sourceMissionId,
          requestId: delegation.requestId,
          context: delegation.context,
        }),
        priority: delegation.priority,
        requiredCapabilities: delegation.requiredCapabilities,
        requestId: `delegation:${delegation.requestId}`,
      });

      await activities.logActivity({
        missionId: input.missionId,
        type: "cross_mission_delegation_received",
        message: `Received delegation from mission ${delegation.sourceMissionId}: ${delegation.taskTitle}`,
        metadata: {
          requestId: delegation.requestId,
          sourceMissionId: delegation.sourceMissionId,
          requiredCapabilities: delegation.requiredCapabilities,
          priority: delegation.priority,
        },
      });
      continue;
    }

    if (event.type === "delegation_response") {
      state.pendingDelegations = state.pendingDelegations.filter(
        (pending) => pending.requestId !== event.response.requestId
      );

      await activities.writeMemory({
        missionId: input.missionId,
        key: `delegation:response:${event.response.requestId}`,
        value: event.response,
        scope: "mission",
      });

      await activities.logActivity({
        missionId: input.missionId,
        type: "cross_mission_delegation_response",
        message: `Delegation response received for request ${event.response.requestId}: ${event.response.status}`,
        metadata: {
          requestId: event.response.requestId,
          targetMissionId: event.response.targetMissionId,
          status: event.response.status,
          reason: event.response.reason,
        },
      });
      continue;
    }

    if (event.type === "knowledge_broadcast") {
      await activities.writeMemory({
        missionId: input.missionId,
        key: `knowledge:broadcast:${event.knowledgeId}`,
        value: {
          knowledgeId: event.knowledgeId,
          category: event.category,
          summary: event.summary,
          sourceMissionId: event.sourceMissionId,
          receivedAt: workflowInfo().unsafe.now(),
        },
        scope: "mission",
      });

      await activities.logActivity({
        missionId: input.missionId,
        type: "cross_mission_knowledge_received",
        message: `Knowledge broadcast received from mission ${event.sourceMissionId}`,
        metadata: {
          knowledgeId: event.knowledgeId,
          category: event.category,
          sourceMissionId: event.sourceMissionId,
        },
      });
      continue;
    }

    if (event.type === "agent_lease_granted") {
      await activities.writeMemory({
        missionId: input.missionId,
        key: `agent:lease:${event.lease.agentId}`,
        value: event.lease,
        scope: "mission",
      });

      await activities.logActivity({
        missionId: input.missionId,
        type: "agent_lease_granted",
        message: `Agent lease granted: ${event.lease.agentName}`,
        metadata: {
          agentId: event.lease.agentId,
          leaseExpiresAt: event.lease.leaseExpiresAt,
          taskId: event.lease.taskId,
        },
      });
      continue;
    }

    if (event.type === "agent_lease_denied") {
      await activities.writeMemory({
        missionId: input.missionId,
        key: `agent:lease:denied:${event.requestId}`,
        value: {
          requestId: event.requestId,
          reason: event.reason,
          deniedAt: workflowInfo().unsafe.now(),
        },
        scope: "mission",
      });

      await activities.logActivity({
        missionId: input.missionId,
        type: "agent_lease_denied",
        message: `Agent lease denied for request ${event.requestId}: ${event.reason}`,
        metadata: {
          requestId: event.requestId,
          reason: event.reason,
        },
      });
      continue;
    }

    await activities.writeMemory({
      missionId: input.missionId,
      key: `agent:lease:${event.agentId}`,
      value: {
        agentId: event.agentId,
        revokedAt: workflowInfo().unsafe.now(),
        reason: event.reason,
      },
      scope: "mission",
    });

    await activities.logActivity({
      missionId: input.missionId,
      type: "agent_lease_revoked",
      message: `Agent lease revoked: ${event.agentId}`,
      metadata: {
        agentId: event.agentId,
        reason: event.reason,
      },
    });
  }
}

async function registerMissionCapabilities(input: {
  missionId: string;
  teamId: string;
  objective: string;
  maxConcurrentRuns: number;
}): Promise<void> {
  try {
    const agents = await activities.getMissionAgents({
      missionId: input.missionId,
    });
    const capabilities = [
      ...new Set(agents.agents.flatMap((agent) => agent.capabilities)),
    ];

    await activities.registerMissionCapabilities({
      missionId: input.missionId,
      teamId: input.teamId,
      capabilities,
      objective: input.objective,
      maxConcurrentRuns: input.maxConcurrentRuns,
    });
  } catch (error) {
    await activities.logActivity({
      missionId: input.missionId,
      type: "mission_discovery_registration_failed",
      message: `Failed to register mission capabilities: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function signalAgentInbox(
  childWorkflowId: string,
  envelope: AgentMessageEnvelope
): Promise<boolean> {
  try {
    const handle = getExternalWorkflowHandle(childWorkflowId);
    await handle.signal(agentInboxDeliverySignal, { envelope });
    return true;
  } catch {
    return false;
  }
}

function getOrCreateShard(
  state: OrchestratorState,
  missionId: string,
  teamId: string
): string {
  for (const [existingShardId, agentCount] of state.activeShards) {
    if (agentCount < SHARD_THRESHOLD) {
      state.activeShards.set(existingShardId, agentCount + 1);
      return existingShardId;
    }
  }

  state.shardCounter += 1;
  const shardId = `shard-${state.shardCounter}`;
  const shardWorkflowId = `mission-shard:${missionId}:${shardId}`;

  startChild("missionSubOrchestratorWorkflow", {
    workflowId: shardWorkflowId,
    args: [
      {
        missionId,
        teamId,
        shardId,
        parentWorkflowId: workflowInfo().workflowId,
      },
    ],
  });

  state.activeShards.set(shardWorkflowId, 1);
  return shardWorkflowId;
}

async function runMissionHealthMonitorLegacy(
  input: {
    missionId: string;
  },
  state: OrchestratorState
): Promise<void> {
  const healthSnapshot = await reflectionActivities.checkMissionHealth({
    missionId: input.missionId,
  });
  state.missionHealthSnapshot = healthSnapshot;

  const stalledAgents = healthSnapshot.agents.filter(
    (agent) => agent.status === "stuck"
  );
  for (const stalled of stalledAgents) {
    await activities.logActivity({
      missionId: input.missionId,
      type: "health_stalled_agent_detected",
      message: `Agent ${stalled.agentId} stuck on task ${stalled.taskId} (progress: ${(stalled.lastProgressScore * 100).toFixed(0)}%, replans: ${stalled.replanCount})`,
      metadata: {
        agentId: stalled.agentId,
        taskId: stalled.taskId,
        progressScore: stalled.lastProgressScore,
        replanCount: stalled.replanCount,
      },
    });
  }

  await processDependencyFailures(
    input,
    state,
    healthSnapshot.failedDependencies
  );
}

async function processLatestHealthSnapshot(
  input: { missionId: string },
  state: OrchestratorState
): Promise<void> {
  const snapshot = state.missionHealthSnapshot;
  const hasNewSnapshot =
    snapshot !== null && snapshot.timestamp !== state.healthSnapshotProcessedAt;
  const hasPendingDepFailures = state.pendingDependencyFailures.length > 0;

  if (!(hasNewSnapshot || hasPendingDepFailures)) {
    return;
  }

  if (hasNewSnapshot) {
    const stalledAgents = snapshot.agents.filter(
      (agent) => agent.status === "stuck"
    );
    for (const stalled of stalledAgents) {
      await activities.logActivity({
        missionId: input.missionId,
        type: "health_stalled_agent_detected",
        message: `Agent ${stalled.agentId} stuck on task ${stalled.taskId} (progress: ${(stalled.lastProgressScore * 100).toFixed(0)}%, replans: ${stalled.replanCount})`,
        metadata: {
          agentId: stalled.agentId,
          taskId: stalled.taskId,
          progressScore: stalled.lastProgressScore,
          replanCount: stalled.replanCount,
        },
      });
    }
    state.healthSnapshotProcessedAt = snapshot.timestamp;
  }

  const snapshotDeps = hasNewSnapshot ? snapshot.failedDependencies : [];
  await processDependencyFailures(input, state, snapshotDeps);
}

async function processDependencyFailures(
  input: { missionId: string },
  state: OrchestratorState,
  snapshotDeps: Array<{ failedTaskId: string; blockedTaskIds: string[] }>
): Promise<void> {
  const pendingDependencyFailures: Array<{
    failedTaskId: string;
    failedTaskTitle: string;
    reason: string;
  }> = [
    ...snapshotDeps.map((dependency) => ({
      failedTaskId: dependency.failedTaskId,
      failedTaskTitle: dependency.failedTaskId,
      reason: "Upstream task is blocked or failed",
    })),
    ...state.pendingDependencyFailures.map((dependency) => ({
      failedTaskId: dependency.failedTaskId,
      failedTaskTitle: dependency.failedTaskTitle,
      reason: dependency.reason,
    })),
  ];
  state.pendingDependencyFailures = [];

  for (const dependencyFailure of pendingDependencyFailures) {
    const markerKey = `dep_failure_notified:${dependencyFailure.failedTaskId}`;
    const alreadyNotified = await activities.readMemory({
      missionId: input.missionId,
      key: markerKey,
      scope: "mission",
    });

    if (alreadyNotified) {
      continue;
    }

    await reflectionActivities.notifyDependencyFailure({
      missionId: input.missionId,
      failedTaskId: dependencyFailure.failedTaskId,
      failedTaskTitle: dependencyFailure.failedTaskTitle,
      reason: dependencyFailure.reason,
    });

    await activities.writeMemory({
      missionId: input.missionId,
      key: markerKey,
      value: true,
      scope: "mission",
    });
  }
}

async function maybeRunStandup(
  input: {
    missionId: string;
    objective: string;
    standupIntervalMin?: number;
  },
  state: OrchestratorState
): Promise<void> {
  if (!input.standupIntervalMin) {
    return;
  }
  if (state.activeAgents.size === 0) {
    return;
  }

  const now = workflowInfo().unsafe.now();
  const intervalMs = input.standupIntervalMin * 60_000;
  if (state.lastStandupAt && now - state.lastStandupAt < intervalMs) {
    return;
  }

  state.lastStandupAt = now;
  state.standupRoundCount += 1;
  const roundId = `standup-${state.standupRoundCount}`;

  const standupRequest: AgentMessageEnvelope = {
    message: {
      id: `standup-req-${roundId}`,
      missionId: input.missionId,
      senderId: "orchestrator",
      senderName: "Mission Control",
      recipientId: BROADCAST_RECIPIENT,
      kind: "request",
      priority: "high",
      subject: "standup_request",
      body: { roundId, requestedAt: now },
      correlationId: roundId,
      createdAt: now,
      expiresAt: now + 60_000,
    },
    ttlMs: 60_000,
  };

  for (const agent of state.activeAgents.values()) {
    await signalAgentInbox(agent.childWorkflowId, standupRequest);
  }

  await activities.logActivity({
    missionId: input.missionId,
    type: "standup_round_started",
    message: `Standup round #${state.standupRoundCount} started — awaiting reports from ${state.activeAgents.size} agents`,
    metadata: { roundId, activeAgentCount: state.activeAgents.size },
  });

  const STANDUP_COLLECTION_TIMEOUT_MS = 30_000;
  const reports: StandupReport[] = [];
  const respondedAgentIds = new Set<string>();

  await condition(() => {
    const standupMessages = state.pendingMessages.filter(
      (env) =>
        env.message.subject === "standup_report" &&
        env.message.correlationId === roundId
    );

    for (const env of standupMessages) {
      if (!respondedAgentIds.has(env.message.senderId)) {
        respondedAgentIds.add(env.message.senderId);
        const parsed = StandupReportSchema.safeParse(env.message.body);
        if (parsed.success) {
          reports.push(parsed.data);
        }
      }
    }

    return respondedAgentIds.size >= state.activeAgents.size;
  }, STANDUP_COLLECTION_TIMEOUT_MS);

  state.pendingMessages = state.pendingMessages.filter(
    (env) =>
      !(
        env.message.subject === "standup_report" &&
        env.message.correlationId === roundId
      )
  );

  const missedAgentIds = [...state.activeAgents.keys()].filter(
    (id) => !respondedAgentIds.has(id)
  );

  const { summary } = await reflectionActivities.synthesizeStandup({
    missionId: input.missionId,
    roundId,
    reports,
    missedAgentIds,
    missionObjective: input.objective,
  });

  await activities.writeMemory({
    missionId: input.missionId,
    key: `standup:${roundId}`,
    value: summary,
    scope: "mission",
  });

  await activities.logActivity({
    missionId: input.missionId,
    type: "standup_summary",
    message: `Standup #${state.standupRoundCount}: ${summary.overallHealth} — ${reports.length}/${state.activeAgents.size} reported, ${summary.conflicts.length} conflicts`,
    metadata: {
      roundId,
      overallHealth: summary.overallHealth,
      reportCount: reports.length,
      conflictCount: summary.conflicts.length,
      missedAgents: missedAgentIds,
      actionItems: summary.actionItems,
    },
  });
}

function computePerAgentBudgetCents(
  missionBudgetCents: number | undefined,
  consumedCents: number,
  maxConcurrentRuns: number
): number | undefined {
  if (missionBudgetCents === undefined) {
    return;
  }
  const remainingCents = missionBudgetCents - consumedCents;
  if (remainingCents <= 0) {
    return;
  }
  return Math.max(
    10,
    Math.floor(remainingCents / Math.max(maxConcurrentRuns, 1))
  );
}

export async function missionOrchestratorWorkflow(
  rawInput: unknown
): Promise<MissionOrchestratorOutput> {
  const input = MissionOrchestratorInputSchema.parse(rawInput);

  const state: OrchestratorState = {
    status: "idle",
    dispatchedRuns: input.checkpoint?.dispatchedRuns ?? 0,
    completedTasks: input.checkpoint?.completedTasks ?? 0,
    consumedCents: input.checkpoint?.consumedCents ?? 0,
    spawnedAgentCount: input.checkpoint?.spawnedAgentCount ?? 0,
    lastDispatchAt: input.checkpoint?.lastDispatchAt,
    queueDepth: 0,
    runningAgents: 0,
    wakeQueue: [],
    spawnQueue: [],
    claimQueue: [],
    crossMissionEvents: input.checkpoint?.crossMissionEvents ?? [],
    pendingDelegations: [],
    missionHealthSnapshot: null,
    healthSnapshotProcessedAt: undefined,
    pendingDependencyFailures: [],
    reviewConsensusQueue: [],
    activeAgents: new Map(),
    pendingMessages: input.checkpoint?.pendingMessages ?? [],
    lastStandupAt: undefined,
    standupRoundCount: 0,
    shardMap: new Map(),
    activeShards: new Map(),
    shardCounter: 0,
    spawnTree: new Map(input.checkpoint?.spawnTree ?? []),
  };
  const dynamicSpawnEnabled = patched("dynamic-spawn-v1");

  if (state.crossMissionEvents.length > 0) {
    state.wakeQueue.push({ reason: "cross_mission_checkpoint" });
  }

  setHandler(missionRuntimeQuery, () => ({
    status: state.status,
    queueDepth: state.queueDepth,
    runningAgents: state.runningAgents,
    lastDispatchAt: state.lastDispatchAt,
    budgetRemaining:
      input.budgetCents !== undefined
        ? Math.max(0, input.budgetCents - state.consumedCents)
        : undefined,
    dispatchedRuns: state.dispatchedRuns,
    completedTasks: state.completedTasks,
  }));

  setHandler(missionWakeSignal, (payload) => {
    state.wakeQueue.push({
      reason: payload.reason,
      metadata: payload.metadata,
    });
  });

  setHandler(crossMissionSignal, (payload) => {
    state.crossMissionEvents.push(payload);
    state.wakeQueue.push({ reason: "cross_mission_event" });
  });

  setHandler(crossMissionPendingDelegationsQuery, () => [
    ...state.pendingDelegations,
  ]);
  setHandler(missionHealthQuery, () => state.missionHealthSnapshot);

  setHandler(missionCommandSignal, (payload) => {
    switch (payload.action) {
      case "pause":
        state.status = "paused";
        break;
      case "resume":
        state.status = "idle";
        break;
      case "cancel":
        state.status = "cancelled";
        break;
      default:
        break;
    }
  });

  setHandler(spawnAgentSignal, (payload) => {
    if (!dynamicSpawnEnabled) {
      return;
    }

    state.spawnQueue.push(payload);
    state.wakeQueue.push({
      reason: "spawn",
      metadata: {
        requestId: payload.requestId,
        requestingAgentId: payload.request.requestingAgentId,
      },
    });
  });

  setHandler(agentClaimTaskSignal, (payload) => {
    state.claimQueue.push(payload);
    state.wakeQueue.push({
      reason: "agent_claim",
      metadata: {
        claimId: payload.claimId,
        agentId: payload.agentId,
        taskId: payload.taskId,
      },
    });
  });

  setHandler(peerReviewConsensusSignal, (payload) => {
    state.reviewConsensusQueue.push(payload);
    state.wakeQueue.push({
      reason: "peer_review_consensus",
      metadata: {
        taskId: payload.taskId,
        verdict: payload.consensus.finalVerdict,
      },
    });
  });

  setHandler(dependencyFailureSignal, (payload) => {
    state.pendingDependencyFailures.push(payload);
    state.wakeQueue.push({
      reason: "dependency_failure",
      metadata: {
        failedTaskId: payload.failedTaskId,
      },
    });
  });

  setHandler(agentCompletedSignal, (payload: AgentCompletedPayload) => {
    state.activeAgents.delete(payload.agentId);
    state.runningAgents = state.activeAgents.size;
    state.completedTasks += payload.completedTasks;
    state.consumedCents += payload.costCents;

    const agentShardId = state.shardMap.get(payload.agentId);
    if (agentShardId) {
      state.shardMap.delete(payload.agentId);
      const count = state.activeShards.get(agentShardId) ?? 1;
      if (count <= 1) {
        state.activeShards.delete(agentShardId);
      } else {
        state.activeShards.set(agentShardId, count - 1);
      }
    }

    state.wakeQueue.push({
      reason: "agent_completed",
      metadata: {
        agentId: payload.agentId,
        runId: payload.runId,
        status: payload.status,
        error: payload.error,
      },
    });
  });

  setHandler(agentMessageRouteSignal, async (payload) => {
    const now = workflowInfo().unsafe.now();
    const envelope: AgentMessageEnvelope = {
      ...payload.envelope,
      routedAt: now,
    };

    if (envelope.message.expiresAt && now > envelope.message.expiresAt) {
      return;
    }

    const recipientId = envelope.message.recipientId;

    if (recipientId === BROADCAST_RECIPIENT) {
      const shardIds = new Set<string>();
      for (const agent of state.activeAgents.values()) {
        if (agent.agentId === envelope.message.senderId) {
          continue;
        }

        const shardWorkflowId = state.shardMap.get(agent.agentId);
        if (shardWorkflowId) {
          if (!shardIds.has(shardWorkflowId)) {
            shardIds.add(shardWorkflowId);
            const shardHandle = getExternalWorkflowHandle(shardWorkflowId);
            await shardHandle.signal(shardMessageRouteSignal, { envelope });
          }
        } else {
          await signalAgentInbox(agent.childWorkflowId, envelope);
        }
      }
      return;
    }

    const shardWorkflowId = state.shardMap.get(recipientId);
    if (shardWorkflowId) {
      const shardHandle = getExternalWorkflowHandle(shardWorkflowId);
      await shardHandle.signal(shardMessageRouteSignal, { envelope });
      return;
    }

    const target = state.activeAgents.get(recipientId);
    if (target) {
      const delivered = await signalAgentInbox(
        target.childWorkflowId,
        envelope
      );
      if (delivered) {
        return;
      }
    }

    state.pendingMessages.push(envelope);
  });

  const nonBlockingHealthMonitor = patched("non-blocking-health-monitor-v1");

  if (nonBlockingHealthMonitor) {
    setHandler(healthUpdateSignal, (snapshot) => {
      state.missionHealthSnapshot = snapshot;
      state.wakeQueue.push({ reason: "health_update" });
    });

    await startChild("missionHealthMonitorWorkflow", {
      workflowId: `health-monitor:${input.missionId}`,
      args: [
        {
          missionId: input.missionId,
          parentWorkflowId: workflowInfo().workflowId,
        },
      ],
    });
  }

  await activities.logActivity({
    missionId: input.missionId,
    type: "orchestrator_started",
    message: `Mission orchestrator started with objective: ${input.objective.slice(0, 100)}`,
  });

  await registerMissionCapabilities({
    missionId: input.missionId,
    teamId: input.teamId,
    objective: input.objective,
    maxConcurrentRuns: input.maxConcurrentRuns,
  });

  while (state.status !== "cancelled" && state.status !== "completed") {
    await condition(
      () =>
        state.wakeQueue.length > 0 ||
        state.status === "cancelled" ||
        state.status === "completed",
      input.heartbeatIntervalMin * 60 * 1000
    );

    if ((state.status as OrchestratorStatus) === "cancelled") {
      break;
    }
    if (state.status === "paused") {
      await condition(() => (state.status as OrchestratorStatus) !== "paused");
      if ((state.status as OrchestratorStatus) === "cancelled") {
        break;
      }
    }

    state.wakeQueue = [];
    const now = workflowInfo().unsafe.now();
    state.pendingMessages = state.pendingMessages.filter(
      (envelope) =>
        !envelope.message.expiresAt || envelope.message.expiresAt > now
    );

    await processCrossMissionEvents(
      {
        missionId: input.missionId,
        teamId: input.teamId,
      },
      state
    );

    await registerMissionCapabilities({
      missionId: input.missionId,
      teamId: input.teamId,
      objective: input.objective,
      maxConcurrentRuns: input.maxConcurrentRuns,
    });

    if (
      input.budgetCents !== undefined &&
      state.consumedCents >= input.budgetCents
    ) {
      await activities.finalizeMission({
        missionId: input.missionId,
        status: "COMPLETED",
      });

      await activities.logActivity({
        missionId: input.missionId,
        type: "budget_exceeded",
        message: `Budget limit reached: ${state.consumedCents}/${input.budgetCents} cents`,
      });

      return {
        missionId: input.missionId,
        dispatchedRuns: state.dispatchedRuns,
        completedTasks: state.completedTasks,
        consumedCents: state.consumedCents,
        status: "budget_exceeded",
      };
    }

    if (dynamicSpawnEnabled) {
      await processSpawnRequests(
        {
          missionId: input.missionId,
          budgetCents: input.budgetCents,
          spawnLimits: input.spawnLimits,
        },
        state
      );
    }

    await processAgentClaims(
      {
        missionId: input.missionId,
        maxConcurrentRuns: input.maxConcurrentRuns,
        budgetCents: input.budgetCents,
      },
      state
    );

    await processReviewConsensus({ missionId: input.missionId }, state);

    await refreshReviewQueue(
      { missionId: input.missionId, reviewGating: input.reviewGating },
      state
    );

    state.status = "dispatching";

    const queue = await activities.refreshQueue({
      missionId: input.missionId,
    });
    state.queueDepth = queue.tasks.length;

    if (queue.tasks.length === 0) {
      const stats = await activities.getMissionStats({
        missionId: input.missionId,
      });
      state.runningAgents = stats.runs.running;

      if (stats.runs.running === 0) {
        state.status = "completed";
        break;
      }

      try {
        if (nonBlockingHealthMonitor) {
          await processLatestHealthSnapshot(
            { missionId: input.missionId },
            state
          );
        } else {
          await runMissionHealthMonitorLegacy(
            { missionId: input.missionId },
            state
          );
        }
      } catch {
        await activities.logActivity({
          missionId: input.missionId,
          type: "health_monitor_error",
          message: "Health monitor failed — continuing orchestration",
        });
      }

      await maybeRunStandup(
        {
          missionId: input.missionId,
          objective: input.objective,
          standupIntervalMin: input.standupIntervalMin,
        },
        state
      );

      state.status = "idle";
      continue;
    }

    const plan = await activities.planDispatch({
      missionId: input.missionId,
      pendingTasks: queue.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        assigneeId: t.assigneeId,
        requiredCapabilities: t.requiredCapabilities,
      })),
      maxConcurrentRuns: input.maxConcurrentRuns,
    });

    let dispatchedThisCycle = 0;

    for (const dispatch of plan.dispatches) {
      const claimed = await activities.claimTask({
        taskId: dispatch.taskId,
        agentId: dispatch.agentId,
      });

      if (!claimed.claimed) {
        continue;
      }

      const { runId } = await activities.createRun({
        missionId: input.missionId,
        taskId: dispatch.taskId,
        agentId: dispatch.agentId,
      });

      const childWorkflowId = `mission-run:${input.missionId}:${runId}`;

      const perAgentBudget = computePerAgentBudgetCents(
        input.budgetCents,
        state.consumedCents,
        input.maxConcurrentRuns
      );

      const pendingForAgent = state.pendingMessages.filter(
        (envelope) =>
          envelope.message.recipientId === dispatch.agentId &&
          (!envelope.message.expiresAt ||
            envelope.message.expiresAt > workflowInfo().unsafe.now())
      );

      if (pendingForAgent.length > 0) {
        state.pendingMessages = state.pendingMessages.filter(
          (envelope) => envelope.message.recipientId !== dispatch.agentId
        );
      }

      const useSharding =
        patched("sharded-orchestration-v1") &&
        state.activeAgents.size >= SHARD_THRESHOLD;

      if (useSharding) {
        const shardWorkflowId = getOrCreateShard(
          state,
          input.missionId,
          input.teamId
        );

        const shardPayload: ShardDispatchPayload = {
          agentId: dispatch.agentId,
          agentName: dispatch.agentName,
          childWorkflowId,
          taskId: dispatch.taskId,
          soulPrompt: dispatch.soulPrompt,
          tools: dispatch.tools,
          maxSteps: 20,
          budgetCentsLimit: perAgentBudget,
          runId,
          pendingMessages: pendingForAgent,
        };

        const shardHandle = getExternalWorkflowHandle(shardWorkflowId);
        await shardHandle.signal(shardDispatchSignal, shardPayload);

        state.shardMap.set(dispatch.agentId, shardWorkflowId);
      } else {
        await startChild("missionAgentRunWorkflow", {
          workflowId: childWorkflowId,
          args: [
            {
              missionId: input.missionId,
              teamId: input.teamId,
              agentId: dispatch.agentId,
              agentName: dispatch.agentName,
              taskId: dispatch.taskId,
              runId,
              soulPrompt: dispatch.soulPrompt,
              tools: dispatch.tools,
              maxSteps: 20,
              budgetCentsLimit: perAgentBudget,
            },
          ],
        });

        for (const envelope of pendingForAgent) {
          const delivered = await signalAgentInbox(childWorkflowId, envelope);
          if (!delivered) {
            state.pendingMessages.push(envelope);
          }
        }
      }

      state.activeAgents.set(dispatch.agentId, {
        agentId: dispatch.agentId,
        childWorkflowId,
        agentName: dispatch.agentName,
      });
      state.runningAgents = state.activeAgents.size;

      await activities.updateRun({
        runId,
        status: "RUNNING",
        startedAt: workflowInfo().unsafe.now(),
      });

      await activities.logActivity({
        missionId: input.missionId,
        type: "agent_dispatched",
        message: `Agent "${dispatch.agentName}" dispatched for task "${dispatch.taskTitle}"`,
        agentId: dispatch.agentId,
        metadata: {
          agentName: dispatch.agentName,
          taskId: dispatch.taskId,
          taskTitle: dispatch.taskTitle,
          runId,
        },
      });

      state.dispatchedRuns += 1;
      state.lastDispatchAt = workflowInfo().unsafe.now();
      dispatchedThisCycle += 1;
    }

    if (dispatchedThisCycle > 0 && patched("self-wake-after-dispatch")) {
      state.wakeQueue.push({ reason: "dispatch_cycle_complete" });
    }

    try {
      if (nonBlockingHealthMonitor) {
        await processLatestHealthSnapshot(
          { missionId: input.missionId },
          state
        );
      } else {
        await runMissionHealthMonitorLegacy(
          { missionId: input.missionId },
          state
        );
      }
    } catch {
      await activities.logActivity({
        missionId: input.missionId,
        type: "health_monitor_error",
        message: "Health monitor failed — continuing to finalization",
      });
    }

    await maybeRunStandup(
      {
        missionId: input.missionId,
        objective: input.objective,
        standupIntervalMin: input.standupIntervalMin,
      },
      state
    );

    state.status = "idle";

    if (workflowInfo().historyLength > HISTORY_EVENT_THRESHOLD) {
      return continueAsNew<typeof missionOrchestratorWorkflow>({
        ...input,
        checkpoint: {
          dispatchedRuns: state.dispatchedRuns,
          completedTasks: state.completedTasks,
          consumedCents: state.consumedCents,
          lastDispatchAt: state.lastDispatchAt,
          spawnedAgentCount: state.spawnedAgentCount,
          pendingMessages: state.pendingMessages,
          crossMissionEvents: state.crossMissionEvents,
          spawnTree: [...state.spawnTree.entries()],
        },
      });
    }
  }

  const finalStatus = state.status === "cancelled" ? "cancelled" : "completed";
  const dbStatus = finalStatus === "cancelled" ? "CANCELLED" : "COMPLETED";

  await activities.finalizeMission({
    missionId: input.missionId,
    status: dbStatus,
  });

  await activities.logActivity({
    missionId: input.missionId,
    type: `orchestrator_${finalStatus}`,
    message: `Mission orchestrator ${finalStatus}. Dispatched: ${state.dispatchedRuns}, Completed: ${state.completedTasks}`,
  });

  return {
    missionId: input.missionId,
    dispatchedRuns: state.dispatchedRuns,
    completedTasks: state.completedTasks,
    consumedCents: state.consumedCents,
    status: finalStatus,
  };
}
