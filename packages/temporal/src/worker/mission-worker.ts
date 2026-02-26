import {
  missionDelegateToMission,
  missionDiscoverMissions,
  missionEscalate,
  missionEvaluateProgress,
  missionGetInbox,
  missionGetSpawnTree,
  missionListAgents,
  missionQueryCapabilities,
  missionQueryTeamKnowledge,
  missionRequestReplan,
  missionSendMessage,
  missionSpawnAgent,
  missionStoreTeamKnowledge,
  missionWaitForReply,
  setMissionDelegationServices,
  setMissionMessagingServices,
  setMissionSpawnServices,
  setTeamKnowledgeServices,
  toolRegistry,
} from "@openplane/ai/tools";
import type { Database } from "@openplane/db";
import { createToolServices } from "@openplane/services";
import type { Worker } from "@temporalio/worker";
import {
  type AgentExecutor,
  createAgentActivities,
} from "../activities/agents";
import {
  destroySandbox,
  provisionSandbox,
} from "../activities/agents/sandbox-lifecycle";
import {
  createDefaultReflectionTextGenerator,
  createMissionActivities,
  createMissionTimelinePublisher,
  createReflectionActivities,
} from "../activities/mission";
import { loadMissionWorkerConfig } from "../config";
import { createWorker, type WorkerOptions } from "./factory";

export interface MissionWorkerDependencies {
  db: Database;
  executor: AgentExecutor;
}

export function createMissionWorker(
  deps: MissionWorkerDependencies
): Promise<Worker> {
  toolRegistry.bindServices(createToolServices());

  const missionActivities = createMissionActivities({
    db: deps.db,
    publishTimelineEvent: createMissionTimelinePublisher(deps.db),
  });
  const reflectionActivities = createReflectionActivities({
    db: deps.db,
    generateText: createDefaultReflectionTextGenerator(),
  });

  setMissionMessagingServices({
    sendMessage: async (input) =>
      missionActivities.routeAgentMessage({
        ...input,
        orchestratorWorkflowId: `mission:${input.missionId}`,
      }),
    waitForReply: async (input) => missionActivities.waitForAgentReply(input),
    getInbox: async (input) =>
      missionActivities.fetchAgentInbox({
        missionId: input.missionId,
        agentId: input.agentId,
        limit: input.limit,
      }),
  });

  setMissionSpawnServices({
    requestAgentSpawn: async (input) =>
      missionActivities.requestAgentSpawn({
        ...input,
        orchestratorWorkflowId: `mission:${input.missionId}`,
      }),
    getMissionAgents: async (input) =>
      missionActivities.getMissionAgents(input),
    getSpawnTree: async (input) => missionActivities.getSpawnTree(input),
  });

  setTeamKnowledgeServices({
    queryTeamKnowledge: async (input) =>
      missionActivities.queryTeamKnowledge(input),
    storeTeamKnowledge: async (input) =>
      missionActivities.storeTeamKnowledge(input),
  });

  setMissionDelegationServices({
    discoverMissions: async (input) =>
      missionActivities.discoverMissions(input),
    delegateTask: async (input) =>
      missionActivities.delegateTaskToMission(input),
  });

  missionSendMessage.register();
  missionWaitForReply.register();
  missionGetInbox.register();
  missionEvaluateProgress.register();
  missionRequestReplan.register();
  missionEscalate.register();
  missionQueryCapabilities.register();
  missionSpawnAgent.register();
  missionListAgents.register();
  missionGetSpawnTree.register();
  missionQueryTeamKnowledge.register();
  missionStoreTeamKnowledge.register();
  missionDiscoverMissions.register();
  missionDelegateToMission.register();

  const agentActivities = createAgentActivities({
    db: deps.db,
    executor: deps.executor,
  });

  const workerConfig = loadMissionWorkerConfig();

  const options: WorkerOptions = {
    taskQueue: workerConfig.taskQueue,
    workflowsPath: new URL("../workflows/index.js", import.meta.url).pathname,
    activities: {
      ...missionActivities,
      ...reflectionActivities,
      ...agentActivities,
      provisionSandbox,
      destroySandbox,
    } as Record<string, unknown>,
    maxConcurrentActivityTaskExecutions:
      workerConfig.maxConcurrentActivityTaskExecutions,
    maxConcurrentWorkflowTaskExecutions:
      workerConfig.maxConcurrentWorkflowTaskExecutions,
    maxCachedWorkflows: workerConfig.maxCachedWorkflows,
  };

  return createWorker(options);
}
