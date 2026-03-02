import { beforeEach, describe, expect, it, vi } from "vitest";
import { TASK_QUEUES } from "../config/task-queues";

const mockCreateWorkerConnection = vi.fn();
const mockWorkerCreate = vi.fn();

const mockCreateDatabaseActivities = vi.fn();
const mockCreateStorageActivities = vi.fn();
const mockCreateEngineActivities = vi.fn();
const mockCreateKnowledgeChangeActivities = vi.fn();
const mockCreateKnowledgeInferenceActivities = vi.fn();
const mockCreateKnowledgeCleanupActivities = vi.fn();
const mockBindToolServices = vi.fn();
const mockCreateToolServices = vi.fn(() => ({}));

const mockMissionDelegateToMissionRegister = vi.fn();
const mockMissionDiscoverMissionsRegister = vi.fn();
const mockMissionEscalateRegister = vi.fn();
const mockMissionEvaluateProgressRegister = vi.fn();
const mockMissionGetInboxRegister = vi.fn();
const mockMissionGetSpawnTreeRegister = vi.fn();
const mockMissionListAgentsRegister = vi.fn();
const mockMissionQueryCapabilitiesRegister = vi.fn();
const mockMissionQueryTeamKnowledgeRegister = vi.fn();
const mockMissionRequestReplanRegister = vi.fn();
const mockMissionSendMessageRegister = vi.fn();
const mockMissionSpawnAgentRegister = vi.fn();
const mockMissionStoreTeamKnowledgeRegister = vi.fn();
const mockMissionWaitForReplyRegister = vi.fn();

vi.mock("../connection", () => ({
  createWorkerConnection: mockCreateWorkerConnection,
}));

vi.mock("@temporalio/worker", () => ({
  NativeConnection: {
    connect: mockCreateWorkerConnection,
  },
  Worker: {
    create: mockWorkerCreate,
  },
}));

vi.mock("@openplane/db", () => ({
  default: {},
}));

vi.mock("@openplane/storage", () => ({
  S3StorageProvider: class {},
}));

vi.mock("@openplane/vespa", () => ({
  vespaClient: {},
}));

vi.mock("@openplane/services", () => ({
  createToolServices: mockCreateToolServices,
}));

vi.mock("@openplane/ai/tools", () => ({
  missionDelegateToMission: { register: mockMissionDelegateToMissionRegister },
  missionDiscoverMissions: { register: mockMissionDiscoverMissionsRegister },
  missionEscalate: { register: mockMissionEscalateRegister },
  missionEvaluateProgress: { register: mockMissionEvaluateProgressRegister },
  missionGetInbox: { register: mockMissionGetInboxRegister },
  missionGetSpawnTree: { register: mockMissionGetSpawnTreeRegister },
  missionListAgents: { register: mockMissionListAgentsRegister },
  missionQueryCapabilities: { register: mockMissionQueryCapabilitiesRegister },
  missionQueryTeamKnowledge: {
    register: mockMissionQueryTeamKnowledgeRegister,
  },
  missionRequestReplan: { register: mockMissionRequestReplanRegister },
  missionSendMessage: { register: mockMissionSendMessageRegister },
  missionSpawnAgent: { register: mockMissionSpawnAgentRegister },
  missionStoreTeamKnowledge: {
    register: mockMissionStoreTeamKnowledgeRegister,
  },
  missionWaitForReply: { register: mockMissionWaitForReplyRegister },
  setMissionDelegationServices: vi.fn(),
  setMissionMessagingServices: vi.fn(),
  setMissionSpawnServices: vi.fn(),
  setTeamKnowledgeServices: vi.fn(),
  toolRegistry: {
    bindServices: mockBindToolServices,
  },
}));

vi.mock("../activities/database", () => ({
  createDatabaseActivities: mockCreateDatabaseActivities,
  createCleanupActivities: vi.fn(() => ({})),
}));

vi.mock("../activities/storage", () => ({
  createStorageActivities: mockCreateStorageActivities,
}));

vi.mock("../activities/engine", () => ({
  createEngineActivities: mockCreateEngineActivities,
}));

vi.mock("../activities/knowledge", () => ({
  createKnowledgeChangeActivities: mockCreateKnowledgeChangeActivities,
  createKnowledgeInferenceActivities: mockCreateKnowledgeInferenceActivities,
  createKnowledgeCleanupActivities: mockCreateKnowledgeCleanupActivities,
}));

vi.mock("../activities/connectors", () => ({
  createBaseConnectorActivities: vi.fn(() => ({})),
  createUnifiedSyncActivities: vi.fn(() => ({})),
  registerAllSyncFactories: vi.fn(),
}));

vi.mock("../activities/vespa", () => ({
  createVespaActivities: vi.fn(() => ({})),
}));

vi.mock("../activities/canvas", () => ({
  createAuditActivities: vi.fn(() => ({})),
  createCanvasExecutionActivities: vi.fn(() => ({})),
  createCompensationActivities: vi.fn(() => ({})),
  createRateLimitActivities: vi.fn(() => ({})),
}));

vi.mock("../activities/analytics", () => ({}));
vi.mock("../activities/emergence", () => ({}));
vi.mock("../activities/entities", () => ({}));
vi.mock("../activities/ltr", () => ({}));
vi.mock("../activities/personalization", () => ({}));
vi.mock("../activities/reembed", () => ({}));
vi.mock("../activities/slack", () => ({}));

describe("startWorker bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateWorkerConnection.mockResolvedValue({ id: "connection" });
    mockWorkerCreate.mockResolvedValue({
      run: vi.fn(),
      shutdown: vi.fn(),
    });

    mockCreateDatabaseActivities.mockReturnValue({ dbActivity: vi.fn() });
    mockCreateStorageActivities.mockReturnValue({ storageActivity: vi.fn() });
    mockCreateEngineActivities.mockReturnValue({ engineActivity: vi.fn() });
    mockCreateKnowledgeChangeActivities.mockReturnValue({
      fetchUnprocessedChanges: vi.fn(),
    });
    mockCreateKnowledgeInferenceActivities.mockReturnValue({
      aggregateMentions: vi.fn(),
    });
    mockCreateKnowledgeCleanupActivities.mockReturnValue({
      cleanupKnowledgeChanges: vi.fn(),
    });
  });

  it("uses shared connection helper and passes namespace/task queue to Worker.create", async () => {
    const { startWorker } = await import("../scripts/start-worker");

    await startWorker({
      workerType: "knowledge",
      temporalAddress: "temporal.internal:7233",
      namespace: "team-dev",
    });

    expect(mockCreateWorkerConnection).toHaveBeenCalledWith({
      address: "temporal.internal:7233",
    });

    expect(mockWorkerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: "team-dev",
        taskQueue: TASK_QUEUES.KNOWLEDGE,
        connection: { id: "connection" },
      })
    );
    expect(mockCreateToolServices).toHaveBeenCalledOnce();
    expect(mockBindToolServices).toHaveBeenCalledOnce();
  });
});
