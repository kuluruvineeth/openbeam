import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
import prisma, { type Database } from "@openplane/db";
import { createToolServices } from "@openplane/services";
import {
  S3StorageProvider,
  type StorageConfig,
  type StorageProvider,
} from "@openplane/storage";
import { type VespaClient, vespaClient } from "@openplane/vespa";
import { NativeConnection, Worker } from "@temporalio/worker";
import { createAgentActivities, LlmAgentExecutor } from "../activities/agents";
import {
  destroySandbox,
  provisionSandbox,
} from "../activities/agents/sandbox-lifecycle";
import * as analyticsActivities from "../activities/analytics";
import { createCanvasExecutionActivities } from "../activities/canvas";
import {
  createBaseConnectorActivities,
  createUnifiedSyncActivities,
  registerAllSyncFactories,
} from "../activities/connectors";
import {
  createCleanupActivities,
  createDatabaseActivities,
} from "../activities/database";
import * as emergenceActivities from "../activities/emergence";
import { createEngineActivities } from "../activities/engine";
import * as entitiesActivities from "../activities/entities";
import {
  createKnowledgeChangeActivities,
  createKnowledgeCleanupActivities,
  createKnowledgeInferenceActivities,
} from "../activities/knowledge";
import * as ltrActivities from "../activities/ltr";
import {
  createDefaultReflectionTextGenerator,
  createMissionActivities,
  createMissionTimelinePublisher,
  createReflectionActivities,
} from "../activities/mission";
import * as personalizationActivities from "../activities/personalization";
import * as reembedActivities from "../activities/reembed";
import * as slackActivities from "../activities/slack";
import { createStorageActivities } from "../activities/storage";
import { createVespaActivities } from "../activities/vespa";
import { loadMissionWorkerConfig, TASK_QUEUES } from "../config";
import type { WorkerType } from "../worker/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface WorkerDependencies {
  db: Database;
  storage: StorageProvider;
  vespa: VespaClient;
  tempDir: string;
}

function loadStorageConfig(): StorageConfig {
  return {
    bucket: process.env.GCS_BUCKET ?? "openplane-files",
    region: process.env.GCS_REGION ?? "us-central1",
    endpoint: process.env.GCS_ENDPOINT,
    publicEndpoint: process.env.GCS_PUBLIC_ENDPOINT,
    accessKeyId: process.env.GCS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.GCS_SECRET_ACCESS_KEY ?? "",
  };
}

function createWorkerDependencies(): WorkerDependencies {
  return {
    db: prisma,
    storage: new S3StorageProvider(loadStorageConfig()),
    vespa: vespaClient,
    tempDir: process.env.TEMP_DIR ?? "/tmp/temporal-worker",
  };
}

export interface StartWorkerOptions {
  workerType: WorkerType;
  taskQueue?: string;
  maxConcurrentActivities?: number;
  maxConcurrentWorkflows?: number;
  temporalAddress?: string;
  namespace?: string;
}

const DEFAULT_OPTIONS = {
  maxConcurrentActivities: 10,
  maxConcurrentWorkflows: 100,
  temporalAddress: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
  namespace: process.env.TEMPORAL_NAMESPACE ?? "default",
};

const SYNC_TASK_QUEUES = [
  TASK_QUEUES.SYNC_GMAIL,
  TASK_QUEUES.SYNC_GOOGLE_DRIVE,
  TASK_QUEUES.SYNC_SLACK,
  TASK_QUEUES.SYNC_LINEAR,
  TASK_QUEUES.SYNC_NOTION,
  TASK_QUEUES.DEFAULT,
];

export function getTaskQueuesForWorkerType(workerType: WorkerType): string[] {
  if (workerType === "sync") {
    return SYNC_TASK_QUEUES;
  }

  const mapping: Record<WorkerType, string> = {
    sync: TASK_QUEUES.SYNC_GMAIL,
    file: TASK_QUEUES.FILE_PROCESSING,
    media: TASK_QUEUES.MEDIA_PROCESSING,
    webhook: TASK_QUEUES.WEBHOOKS,
    agent: TASK_QUEUES.AGENTS,
    canvas: TASK_QUEUES.CANVAS,
    maintenance: TASK_QUEUES.MAINTENANCE,
    scheduled: TASK_QUEUES.SCHEDULED,
    knowledge: TASK_QUEUES.KNOWLEDGE,
    mission: TASK_QUEUES.MISSION,
  };

  return [mapping[workerType] ?? TASK_QUEUES.DEFAULT];
}

function getTaskQueueForWorkerType(workerType: WorkerType): string {
  const mapping: Record<WorkerType, string> = {
    sync: TASK_QUEUES.DEFAULT,
    file: TASK_QUEUES.FILE_PROCESSING,
    media: TASK_QUEUES.MEDIA_PROCESSING,
    webhook: TASK_QUEUES.WEBHOOKS,
    agent: TASK_QUEUES.AGENTS,
    canvas: TASK_QUEUES.CANVAS,
    maintenance: TASK_QUEUES.MAINTENANCE,
    scheduled: TASK_QUEUES.SCHEDULED,
    knowledge: TASK_QUEUES.KNOWLEDGE,
    mission: TASK_QUEUES.MISSION,
  };

  return mapping[workerType] ?? TASK_QUEUES.DEFAULT;
}

export async function startWorker(
  options: StartWorkerOptions
): Promise<Worker> {
  const missionDefaults =
    options.workerType === "mission" ? loadMissionWorkerConfig() : null;

  const merged = { ...DEFAULT_OPTIONS, ...options };
  const { workerType, taskQueue, temporalAddress, namespace } = merged;

  const maxConcurrentActivities =
    merged.maxConcurrentActivities ??
    missionDefaults?.maxConcurrentActivityTaskExecutions ??
    DEFAULT_OPTIONS.maxConcurrentActivities;
  const maxConcurrentWorkflows =
    merged.maxConcurrentWorkflows ??
    missionDefaults?.maxConcurrentWorkflowTaskExecutions ??
    DEFAULT_OPTIONS.maxConcurrentWorkflows;

  const connection = await NativeConnection.connect({
    address: temporalAddress,
  });

  const finalTaskQueue = taskQueue ?? getTaskQueueForWorkerType(workerType);

  const deps = createWorkerDependencies();

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue: finalTaskQueue,
    workflowsPath: join(__dirname, "../workflows"),
    activities: loadActivitiesForWorkerType(workerType, deps),
    maxConcurrentActivityTaskExecutions: maxConcurrentActivities,
    maxConcurrentWorkflowTaskExecutions: maxConcurrentWorkflows,
  });

  return worker;
}

function loadActivitiesForWorkerType(
  workerType: WorkerType,
  deps: WorkerDependencies
): Record<string, unknown> {
  toolRegistry.bindServices(createToolServices());

  const baseActivities = {
    ...createDatabaseActivities({ db: deps.db }),
    ...createStorageActivities({
      storage: deps.storage,
      tempDir: deps.tempDir,
    }),
  };

  const engineActivities = createEngineActivities({});

  switch (workerType) {
    case "sync": {
      registerAllSyncFactories();

      return {
        ...baseActivities,
        ...createBaseConnectorActivities({ db: deps.db }),
        ...createUnifiedSyncActivities({ db: deps.db }),
        ...createVespaActivities({ vespa: deps.vespa }),
        ...engineActivities,
      };
    }

    case "file":
    case "media":
      return {
        ...baseActivities,
        ...engineActivities,
      };

    case "scheduled":
      return {
        ...baseActivities,
        ...createCleanupActivities({ db: deps.db }),
        ...createKnowledgeCleanupActivities({ db: deps.db }),
        ...createKnowledgeInferenceActivities({ db: deps.db }),
        ...createVespaActivities({ vespa: deps.vespa }),
        ...engineActivities,
        ...reembedActivities,
        ...emergenceActivities,
        ...analyticsActivities,
        ...ltrActivities,
        ...entitiesActivities,
        ...personalizationActivities,
        ...slackActivities,
      };

    case "maintenance":
      return {
        ...baseActivities,
        ...createCleanupActivities({ db: deps.db }),
        ...createVespaActivities({ vespa: deps.vespa }),
      };

    case "agent":
      return {
        ...baseActivities,
        ...createAgentActivities({
          db: deps.db,
          executor: new LlmAgentExecutor(),
        }),
      };

    case "canvas":
      return {
        ...baseActivities,
        ...createCanvasExecutionActivities({ db: deps.db }),
      };

    case "mission": {
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
        waitForReply: async (input) =>
          missionActivities.waitForAgentReply(input),
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

      return {
        ...baseActivities,
        ...missionActivities,
        ...reflectionActivities,
        ...createAgentActivities({
          db: deps.db,
          executor: new LlmAgentExecutor(),
        }),
        provisionSandbox,
        destroySandbox,
      };
    }

    case "knowledge":
      return {
        ...baseActivities,
        ...createKnowledgeChangeActivities({
          db: deps.db,
          vespa: deps.vespa,
          engineBaseUrl: process.env.ENGINE_URL ?? "http://localhost:8000",
        }),
        ...createKnowledgeInferenceActivities({ db: deps.db }),
        ...createKnowledgeCleanupActivities({ db: deps.db }),
      };

    default:
      return baseActivities;
  }
}

export async function runWorker(options: StartWorkerOptions): Promise<void> {
  const worker = await startWorker(options);

  const shutdown = () => {
    worker.shutdown();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await worker.run();
}
