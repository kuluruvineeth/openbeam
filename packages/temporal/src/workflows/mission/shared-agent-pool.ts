import {
  HISTORY_EVENT_THRESHOLD,
  SubOrchestratorInputSchema,
  type SubOrchestratorOutput,
} from "@openplane/types/temporal/mission";
import {
  type AgentMessageEnvelope,
  BROADCAST_RECIPIENT,
} from "@openplane/types/temporal/mission-messaging";
import {
  continueAsNew,
  defineQuery,
  defineSignal,
  getExternalWorkflowHandle,
  proxyActivities,
  setHandler,
  startChild,
  workflowInfo,
} from "@temporalio/workflow";
import { conditionWithTimeout, currentTimestamp } from "../temporal-utils";
import {
  agentCompletedSignal,
  agentInboxDeliverySignal,
  type ShardDispatchPayload,
  shardDispatchSignal,
  shardMessageRouteSignal,
} from "../types";

interface AgentPoolEntry {
  agentId: string;
  agentName: string;
  capabilities: string[];
  leasedTo: string | null;
  leaseExpiresAt: number | null;
  leaseTaskId: string | null;
  leasePriority: "P0" | "P1" | "P2" | "P3" | null;
}

interface AgentLeaseRequest {
  requestId: string;
  missionId: string;
  requiredCapabilities: string[];
  taskId: string;
  requestedAt: number;
  timeoutMs: number;
  priority: "P0" | "P1" | "P2" | "P3";
}

const requestLeaseSignal = defineSignal<[AgentLeaseRequest]>("requestLease");
const releaseLeaseSignal =
  defineSignal<[{ agentId: string; missionId: string }]>("releaseLease");
const registerAgentSignal =
  defineSignal<
    [{ agentId: string; agentName: string; capabilities: string[] }]
  >("registerAgent");
const deregisterAgentSignal =
  defineSignal<[{ agentId: string }]>("deregisterAgent");
const poolStateQuery = defineQuery<{
  totalAgents: number;
  availableAgents: number;
  leasedAgents: number;
  pendingRequests: number;
  activeLeasesPerMission: Record<string, number>;
}>("poolState");

const LEASE_DURATION_MS = 600_000;
const LEASE_CHECK_INTERVAL_MS = 30_000;
const MAX_LEASES_PER_MISSION = 3;

interface PoolActivities {
  notifyLeaseGranted: (input: {
    missionId: string;
    grant: {
      requestId: string;
      agentId: string;
      agentName: string;
      leaseExpiresAt: number;
    };
  }) => Promise<void>;
  notifyLeaseExpired: (input: {
    missionId: string;
    agentId: string;
  }) => Promise<void>;
  notifyLeaseDenied: (input: {
    missionId: string;
    requestId: string;
    reason: "timeout" | "quota_exceeded" | "no_match";
  }) => Promise<void>;
}

const activities = proxyActivities<PoolActivities>({
  startToCloseTimeout: "30s",
  retry: {
    maximumAttempts: 3,
  },
});

function sortRequestsByPriority(requests: AgentLeaseRequest[]): void {
  requests.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority < b.priority ? -1 : 1;
    }
    return a.requestedAt - b.requestedAt;
  });
}

function countActiveLeasesPerMission(
  agents: Map<string, AgentPoolEntry>
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const agent of agents.values()) {
    if (agent.leasedTo) {
      counts.set(agent.leasedTo, (counts.get(agent.leasedTo) ?? 0) + 1);
    }
  }
  return counts;
}

function buildCapabilityIndex(
  agents: Map<string, AgentPoolEntry>
): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  for (const agent of agents.values()) {
    for (const capability of agent.capabilities) {
      let set = index.get(capability);
      if (!set) {
        set = new Set();
        index.set(capability, set);
      }
      set.add(agent.agentId);
    }
  }
  return index;
}

function addToCapabilityIndex(
  index: Map<string, Set<string>>,
  agentId: string,
  capabilities: string[]
): void {
  for (const capability of capabilities) {
    let set = index.get(capability);
    if (!set) {
      set = new Set();
      index.set(capability, set);
    }
    set.add(agentId);
  }
}

function removeFromCapabilityIndex(
  index: Map<string, Set<string>>,
  agentId: string,
  capabilities: string[]
): void {
  for (const capability of capabilities) {
    const set = index.get(capability);
    if (set) {
      set.delete(agentId);
      if (set.size === 0) {
        index.delete(capability);
      }
    }
  }
}

function findBestAgent(
  agents: Map<string, AgentPoolEntry>,
  capabilityIndex: Map<string, Set<string>>,
  requiredCapabilities: string[],
  now: number
): AgentPoolEntry | null {
  if (requiredCapabilities.length === 0) {
    for (const agent of agents.values()) {
      if (
        agent.leasedTo === null ||
        (agent.leaseExpiresAt !== null && agent.leaseExpiresAt <= now)
      ) {
        return agent;
      }
    }
    return null;
  }

  const candidateCounts = new Map<string, number>();
  for (const capability of requiredCapabilities) {
    const agentIds = capabilityIndex.get(capability);
    if (!agentIds) {
      continue;
    }
    for (const agentId of agentIds) {
      candidateCounts.set(agentId, (candidateCounts.get(agentId) ?? 0) + 1);
    }
  }

  let bestMatch: AgentPoolEntry | null = null;
  let bestScore = 0;

  for (const [agentId, matchCount] of candidateCounts) {
    const agent = agents.get(agentId);
    if (!agent) {
      continue;
    }
    if (
      agent.leasedTo !== null &&
      (agent.leaseExpiresAt === null || agent.leaseExpiresAt > now)
    ) {
      continue;
    }

    const score = matchCount / requiredCapabilities.length;
    if (score > bestScore) {
      bestMatch = agent;
      bestScore = score;
    }
  }

  return bestMatch;
}

export async function sharedAgentPoolWorkflow(input: {
  teamId: string;
  initialAgents?: Array<{
    agentId: string;
    agentName: string;
    capabilities: string[];
  }>;
  checkpoint?: {
    agents: [string, AgentPoolEntry][];
    activeLeasesPerMission?: [string, number][];
  };
}): Promise<void> {
  const agents = new Map<string, AgentPoolEntry>(
    input.checkpoint?.agents ?? []
  );
  let pendingRequests: AgentLeaseRequest[] = [];
  let wake = false;
  const activeLeasesPerMission = new Map<string, number>(
    input.checkpoint?.activeLeasesPerMission ?? []
  );

  if (input.checkpoint?.agents && activeLeasesPerMission.size === 0) {
    const recounted = countActiveLeasesPerMission(agents);
    for (const [missionId, count] of recounted) {
      activeLeasesPerMission.set(missionId, count);
    }
  }

  if (input.initialAgents) {
    for (const registration of input.initialAgents) {
      agents.set(registration.agentId, {
        agentId: registration.agentId,
        agentName: registration.agentName,
        capabilities: registration.capabilities,
        leasedTo: null,
        leaseExpiresAt: null,
        leaseTaskId: null,
        leasePriority: null,
      });
    }
  }

  const capabilityIndex = buildCapabilityIndex(agents);

  setHandler(poolStateQuery, () => {
    let availableAgents = 0;
    let leasedAgents = 0;

    for (const agent of agents.values()) {
      if (agent.leasedTo) {
        leasedAgents += 1;
      } else {
        availableAgents += 1;
      }
    }

    const leasesRecord: Record<string, number> = {};
    for (const [missionId, count] of activeLeasesPerMission) {
      leasesRecord[missionId] = count;
    }

    return {
      totalAgents: agents.size,
      availableAgents,
      leasedAgents,
      pendingRequests: pendingRequests.length,
      activeLeasesPerMission: leasesRecord,
    };
  });

  setHandler(requestLeaseSignal, (request) => {
    const withDefaults: AgentLeaseRequest = {
      ...request,
      priority: request.priority ?? "P2",
    };
    pendingRequests.push(withDefaults);
    wake = true;
  });

  setHandler(releaseLeaseSignal, (request) => {
    const agent = agents.get(request.agentId);
    if (agent?.leasedTo === request.missionId) {
      const missionId = agent.leasedTo;
      agent.leasedTo = null;
      agent.leaseExpiresAt = null;
      agent.leaseTaskId = null;
      agent.leasePriority = null;

      const currentCount = activeLeasesPerMission.get(missionId) ?? 0;
      if (currentCount <= 1) {
        activeLeasesPerMission.delete(missionId);
      } else {
        activeLeasesPerMission.set(missionId, currentCount - 1);
      }

      wake = true;
    }
  });

  setHandler(registerAgentSignal, (registration) => {
    agents.set(registration.agentId, {
      agentId: registration.agentId,
      agentName: registration.agentName,
      capabilities: registration.capabilities,
      leasedTo: null,
      leaseExpiresAt: null,
      leaseTaskId: null,
      leasePriority: null,
    });
    addToCapabilityIndex(
      capabilityIndex,
      registration.agentId,
      registration.capabilities
    );
    wake = true;
  });

  setHandler(deregisterAgentSignal, ({ agentId }) => {
    const agent = agents.get(agentId);
    if (agent) {
      if (agent.leasedTo) {
        const currentCount = activeLeasesPerMission.get(agent.leasedTo) ?? 0;
        if (currentCount <= 1) {
          activeLeasesPerMission.delete(agent.leasedTo);
        } else {
          activeLeasesPerMission.set(agent.leasedTo, currentCount - 1);
        }
      }
      removeFromCapabilityIndex(capabilityIndex, agentId, agent.capabilities);
    }
    agents.delete(agentId);
    wake = true;
  });

  while (true) {
    await conditionWithTimeout(() => wake, LEASE_CHECK_INTERVAL_MS);
    wake = false;

    const now = currentTimestamp();

    for (const agent of agents.values()) {
      if (
        agent.leasedTo &&
        agent.leaseExpiresAt &&
        agent.leaseExpiresAt < now
      ) {
        const missionId = agent.leasedTo;
        agent.leasedTo = null;
        agent.leaseExpiresAt = null;
        agent.leaseTaskId = null;
        agent.leasePriority = null;

        const currentCount = activeLeasesPerMission.get(missionId) ?? 0;
        if (currentCount <= 1) {
          activeLeasesPerMission.delete(missionId);
        } else {
          activeLeasesPerMission.set(missionId, currentCount - 1);
        }

        await activities.notifyLeaseExpired({
          missionId,
          agentId: agent.agentId,
        });
      }
    }

    sortRequestsByPriority(pendingRequests);

    const remainingRequests: AgentLeaseRequest[] = [];

    for (const request of pendingRequests) {
      if (now - request.requestedAt > request.timeoutMs) {
        await activities.notifyLeaseDenied({
          missionId: request.missionId,
          requestId: request.requestId,
          reason: "timeout",
        });
        continue;
      }

      const missionLeaseCount =
        activeLeasesPerMission.get(request.missionId) ?? 0;
      if (missionLeaseCount >= MAX_LEASES_PER_MISSION) {
        await activities.notifyLeaseDenied({
          missionId: request.missionId,
          requestId: request.requestId,
          reason: "quota_exceeded",
        });
        continue;
      }

      const bestAgent = findBestAgent(
        agents,
        capabilityIndex,
        request.requiredCapabilities,
        now
      );
      if (!bestAgent) {
        remainingRequests.push(request);
        continue;
      }

      bestAgent.leasedTo = request.missionId;
      bestAgent.leaseExpiresAt = now + LEASE_DURATION_MS;
      bestAgent.leaseTaskId = request.taskId;
      bestAgent.leasePriority = request.priority;

      activeLeasesPerMission.set(
        request.missionId,
        (activeLeasesPerMission.get(request.missionId) ?? 0) + 1
      );

      await activities.notifyLeaseGranted({
        missionId: request.missionId,
        grant: {
          requestId: request.requestId,
          agentId: bestAgent.agentId,
          agentName: bestAgent.agentName,
          leaseExpiresAt: bestAgent.leaseExpiresAt,
        },
      });
    }

    pendingRequests = remainingRequests;

    if (workflowInfo().historyLength > HISTORY_EVENT_THRESHOLD) {
      return continueAsNew<typeof sharedAgentPoolWorkflow>({
        teamId: input.teamId,
        checkpoint: {
          agents: [...agents.entries()],
          activeLeasesPerMission: [...activeLeasesPerMission.entries()],
        },
      });
    }
  }
}

interface SubOrchestratorAgent {
  agentId: string;
  agentName: string;
  childWorkflowId: string;
}

async function signalSubAgentInbox(
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

export async function missionSubOrchestratorWorkflow(
  rawInput: unknown
): Promise<SubOrchestratorOutput> {
  const input = SubOrchestratorInputSchema.parse(rawInput);

  const managedAgents = new Map<string, SubOrchestratorAgent>();
  let processedAgents = 0;
  let dispatchQueue: ShardDispatchPayload[] = [];
  let messageQueue: { envelope: AgentMessageEnvelope }[] = [];
  let wake = false;

  setHandler(shardDispatchSignal, (payload) => {
    dispatchQueue.push(payload);
    wake = true;
  });

  setHandler(shardMessageRouteSignal, (payload) => {
    messageQueue.push(payload);
    wake = true;
  });

  setHandler(agentCompletedSignal, (payload) => {
    managedAgents.delete(payload.agentId);
    processedAgents += 1;

    const parentHandle = getExternalWorkflowHandle(input.parentWorkflowId);
    parentHandle.signal(agentCompletedSignal, payload);

    wake = true;
  });

  while (true) {
    await conditionWithTimeout(() => wake, 30_000);
    wake = false;

    const currentDispatches = dispatchQueue;
    dispatchQueue = [];

    for (const dispatch of currentDispatches) {
      await startChild("missionAgentRunWorkflow", {
        workflowId: dispatch.childWorkflowId,
        args: [
          {
            missionId: input.missionId,
            teamId: input.teamId,
            agentId: dispatch.agentId,
            agentName: dispatch.agentName,
            taskId: dispatch.taskId,
            runId: dispatch.runId,
            soulPrompt: dispatch.soulPrompt,
            tools: dispatch.tools,
            maxSteps: dispatch.maxSteps,
            budgetCentsLimit: dispatch.budgetCentsLimit,
          },
        ],
      });

      managedAgents.set(dispatch.agentId, {
        agentId: dispatch.agentId,
        agentName: dispatch.agentName,
        childWorkflowId: dispatch.childWorkflowId,
      });

      for (const envelope of dispatch.pendingMessages) {
        await signalSubAgentInbox(dispatch.childWorkflowId, envelope);
      }
    }

    const currentMessages = messageQueue;
    messageQueue = [];

    for (const { envelope } of currentMessages) {
      const recipientId = envelope.message.recipientId;

      if (recipientId === BROADCAST_RECIPIENT) {
        for (const agent of managedAgents.values()) {
          if (agent.agentId !== envelope.message.senderId) {
            await signalSubAgentInbox(agent.childWorkflowId, envelope);
          }
        }
        continue;
      }

      const target = managedAgents.get(recipientId);
      if (target) {
        await signalSubAgentInbox(target.childWorkflowId, envelope);
      }
    }

    if (
      managedAgents.size === 0 &&
      dispatchQueue.length === 0 &&
      processedAgents > 0
    ) {
      break;
    }

    if (workflowInfo().historyLength > HISTORY_EVENT_THRESHOLD) {
      return continueAsNew<typeof missionSubOrchestratorWorkflow>(input);
    }
  }

  return {
    shardId: input.shardId,
    processedAgents,
    status: "completed",
  };
}
