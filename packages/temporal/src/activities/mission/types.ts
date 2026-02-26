import type {
  ReviewGatingConfig,
  SandboxConfig,
  SpawnAgentRequest,
  SpawnedAgentBlueprint,
  SpawnLimits,
  SpawnRegistryEntry,
  SpawnValidationResult,
} from "@openplane/types/temporal/mission";
import type {
  FetchInboxInput,
  FetchInboxOutput,
  RouteMessageInput,
  RouteMessageOutput,
  WaitForReplyActivityInput,
  WaitForReplyActivityOutput,
} from "./messaging";

export interface RefreshQueueInput {
  missionId: string;
}

export interface RefreshQueueOutput {
  tasks: Array<{
    id: string;
    title: string;
    priority: string;
    assigneeId: string | null;
    dependsOn: string[];
    requiredCapabilities: string[];
  }>;
}

export interface PlanDispatchInput {
  missionId: string;
  pendingTasks: Array<{
    id: string;
    title: string;
    priority: string;
    assigneeId?: string | null;
    requiredCapabilities?: string[];
  }>;
  maxConcurrentRuns: number;
}

export interface DispatchPlan {
  agentId: string;
  agentName: string;
  taskId: string;
  taskTitle: string;
  soulPrompt: string;
  tools: string[];
  sandboxConfig?: SandboxConfig;
}

export interface PlanDispatchOutput {
  dispatches: DispatchPlan[];
}

export interface ClaimTaskInput {
  taskId: string;
  agentId: string;
}

export interface ClaimTaskOutput {
  claimed: boolean;
}

export interface LoadMissionContextInput {
  missionId: string;
  teamId: string;
  agentId: string;
  taskId: string;
}

export interface MissionContext {
  soulPrompt: string;
  taskTitle: string;
  taskDescription: string | null;
  memory: Record<string, unknown>;
  recentComments: Array<{
    content: string;
    taskTitle: string | null;
  }>;
}

export interface LoadMissionContextOutput {
  context: MissionContext;
}

export interface PostCommentInput {
  taskId: string;
  fromAgentId: string;
  content: string;
  mentions?: string[];
}

export interface UpdateBudgetInput {
  missionId: string;
  costCents: number;
}

export interface UpdateBudgetOutput {
  consumedCents: number;
  budgetCents: number | null;
  exceeded: boolean;
}

export interface LogActivityInput {
  missionId: string;
  type: string;
  message: string;
  agentId?: string;
  metadata?: Record<string, unknown>;
}

export interface ReadMemoryInput {
  missionId: string;
  agentId?: string;
  key: string;
  scope?: string;
}

export interface WriteMemoryInput {
  missionId: string;
  agentId?: string;
  key: string;
  value: unknown;
  scope?: string;
}

export interface CreateRunInput {
  missionId: string;
  taskId: string;
  agentId: string;
  workflowId?: string;
}

export interface CreateRunOutput {
  runId: string;
}

export interface UpdateRunInput {
  runId: string;
  status:
    | "QUEUED"
    | "RUNNING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED"
    | "TIMED_OUT";
  startedAt?: number;
  completedAt?: number;
  tokensUsed?: number;
  costCents?: number;
  artifacts?: unknown[];
  error?: string;
}

export interface GetMissionStatsInput {
  missionId: string;
}

export interface MissionStatsOutput {
  tasks: {
    inbox: number;
    assigned: number;
    inProgress: number;
    review: number;
    done: number;
    blocked: number;
    cancelled: number;
  };
  runs: {
    running: number;
    total: number;
  };
  budget: {
    consumed: number;
    limit: number | null;
  };
}

export interface CompleteTaskInput {
  taskId: string;
  agentId: string;
}

export interface CompleteTaskOutput {
  completed: boolean;
}

export interface FinalizeMissionInput {
  missionId: string;
  status: "COMPLETED" | "CANCELLED";
}

export interface CreateTaskInput {
  missionId: string;
  agentId: string;
  title: string;
  description?: string;
  priority?: "P0" | "P1" | "P2" | "P3";
  dependsOn?: string[];
  requiredCapabilities?: string[];
  requestId?: string;
}

export interface CreateTaskOutput {
  taskId: string;
}

export interface RegisterMissionCapabilitiesInput {
  missionId: string;
  teamId: string;
  capabilities: string[];
  objective: string;
  maxConcurrentRuns: number;
}

export interface DiscoverMissionsInput {
  teamId: string;
  requiredCapabilities: string[];
  excludeMissionId: string;
}

export interface DiscoverMissionsOutput {
  missions: Array<{
    missionId: string;
    objective: string;
    capabilities: string[];
    availableSlots: number;
    matchScore: number;
  }>;
}

export interface DelegateTaskToMissionInput {
  sourceMissionId: string;
  targetMissionId: string;
  teamId: string;
  taskTitle: string;
  taskDescription: string;
  requiredCapabilities: string[];
  priority: "P0" | "P1" | "P2" | "P3";
  timeoutMs: number;
  context: Record<string, unknown>;
}

export interface DelegateTaskToMissionOutput {
  requestId: string;
  accepted: boolean;
  reason?: string;
}

export interface QueryTeamKnowledgeInput {
  teamId: string;
  query: string;
  categories?: string[];
  minConfidence?: number;
  limit?: number;
  excludeMissionId?: string;
}

export interface QueryTeamKnowledgeOutput {
  entries: Array<{
    id: string;
    content: string;
    category: string;
    confidence: number;
    sources: string[];
    createdByMissionId: string;
  }>;
}

export interface StoreTeamKnowledgeInput {
  teamId: string;
  missionId: string;
  content: string;
  category: string;
  sources: string[];
  confidence: number;
}

export interface StoreTeamKnowledgeOutput {
  knowledgeId: string;
  deduplicated: boolean;
}

export interface NotifyLeaseGrantedInput {
  missionId: string;
  grant: {
    requestId: string;
    agentId: string;
    agentName: string;
    leaseExpiresAt: number;
  };
}

export interface NotifyLeaseExpiredInput {
  missionId: string;
  agentId: string;
}

export interface NotifyLeaseDeniedInput {
  missionId: string;
  requestId: string;
  reason: "timeout" | "quota_exceeded" | "no_match";
}

export interface SendFeedbackInput {
  taskId: string;
  fromAgentId: string;
  feedback: string;
  targetAgentId?: string;
  reopen: boolean;
}

export interface RequestAgentSpawnInput {
  missionId: string;
  requestId: string;
  requestingAgentId: string;
  taskDescription: string;
  requiredCapabilities: string[];
  suggestedTools?: string[];
  priority?: "P0" | "P1" | "P2" | "P3";
  maxSteps?: number;
  budgetCentsLimit?: number;
  dependsOnTaskId?: string;
  context?: string;
  sandboxConfig?: SandboxConfig;
  orchestratorWorkflowId?: string;
}

export interface RequestAgentSpawnOutput {
  requestId: string;
  delivered: boolean;
}

export interface GetSpawnTreeInput {
  missionId: string;
}

export interface GetSpawnTreeOutput {
  entries: SpawnRegistryEntry[];
}

export interface BrowseInboxInput {
  missionId: string;
  agentId: string;
  capabilities?: string[];
  limit?: number;
}

export interface BrowseInboxOutput {
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    priority: "P0" | "P1" | "P2" | "P3";
    requiredCapabilities: string[];
    dependsOn: string[];
    createdAt: number;
  }>;
}

export interface ValidateAgentClaimInput {
  missionId: string;
  agentId: string;
  taskId: string;
  currentRunningAgents: number;
  maxConcurrentRuns: number;
  consumedCents: number;
  budgetCents?: number;
}

export interface ValidateAgentClaimOutput {
  approved: boolean;
  reason: string;
}

export interface MissionAgentDescriptor {
  id: string;
  name: string;
  role: string;
  level: string;
  capabilities: string[];
  tools: string[];
}

export interface GetMissionAgentsInput {
  missionId: string;
}

export interface GetMissionAgentsOutput {
  agents: MissionAgentDescriptor[];
}

export interface ValidateSpawnRequestInput {
  missionId: string;
  requestId: string;
  request: SpawnAgentRequest;
  currentSpawnedAgentCount: number;
  spawnLimits: SpawnLimits;
  consumedCents: number;
  budgetCents?: number;
}

export interface GenerateSpawnedSoulPromptInput {
  missionId: string;
  requestId: string;
  request: SpawnAgentRequest;
}

export interface GenerateSpawnedSoulPromptOutput {
  blueprint: SpawnedAgentBlueprint;
}

export interface CreateSpawnedAgentInput {
  missionId: string;
  requestId: string;
  request: SpawnAgentRequest;
  blueprint: SpawnedAgentBlueprint;
}

export interface CreateSpawnedAgentOutput {
  missionAgentId: string;
  taskId: string;
}

export interface SelectReviewerInput {
  missionId: string;
  taskId: string;
  authorAgentId: string;
  requiredCapabilities: string[];
}

export interface SelectReviewerOutput {
  reviewerAgentId: string;
  reviewerAgentName: string;
  matchScore: number;
}

export interface CheckReviewGatingInput {
  missionId: string;
  taskId: string;
  taskPriority: "P0" | "P1" | "P2" | "P3";
  reviewGating: ReviewGatingConfig;
}

export interface CheckReviewGatingOutput {
  gated: boolean;
  reason: string;
  requiredReviewers: number;
  completedReviews: number;
}

export interface MissionActivities {
  refreshQueue(input: RefreshQueueInput): Promise<RefreshQueueOutput>;
  planDispatch(input: PlanDispatchInput): Promise<PlanDispatchOutput>;
  claimTask(input: ClaimTaskInput): Promise<ClaimTaskOutput>;
  completeTask(input: CompleteTaskInput): Promise<CompleteTaskOutput>;
  loadMissionContext(
    input: LoadMissionContextInput
  ): Promise<LoadMissionContextOutput>;
  postComment(input: PostCommentInput): Promise<void>;
  updateBudget(input: UpdateBudgetInput): Promise<UpdateBudgetOutput>;
  logActivity(input: LogActivityInput): Promise<void>;
  readMemory(input: ReadMemoryInput): Promise<unknown>;
  writeMemory(input: WriteMemoryInput): Promise<void>;
  createRun(input: CreateRunInput): Promise<CreateRunOutput>;
  updateRun(input: UpdateRunInput): Promise<void>;
  getMissionStats(input: GetMissionStatsInput): Promise<MissionStatsOutput>;
  finalizeMission(input: FinalizeMissionInput): Promise<void>;
  createMissionTask(input: CreateTaskInput): Promise<CreateTaskOutput>;
  sendFeedback(input: SendFeedbackInput): Promise<void>;
  registerMissionCapabilities(
    input: RegisterMissionCapabilitiesInput
  ): Promise<void>;
  discoverMissions(
    input: DiscoverMissionsInput
  ): Promise<DiscoverMissionsOutput>;
  delegateTaskToMission(
    input: DelegateTaskToMissionInput
  ): Promise<DelegateTaskToMissionOutput>;
  queryTeamKnowledge(
    input: QueryTeamKnowledgeInput
  ): Promise<QueryTeamKnowledgeOutput>;
  storeTeamKnowledge(
    input: StoreTeamKnowledgeInput
  ): Promise<StoreTeamKnowledgeOutput>;
  notifyLeaseGranted(input: NotifyLeaseGrantedInput): Promise<void>;
  notifyLeaseExpired(input: NotifyLeaseExpiredInput): Promise<void>;
  notifyLeaseDenied(input: NotifyLeaseDeniedInput): Promise<void>;
  requestAgentSpawn(
    input: RequestAgentSpawnInput
  ): Promise<RequestAgentSpawnOutput>;
  getMissionAgents(
    input: GetMissionAgentsInput
  ): Promise<GetMissionAgentsOutput>;
  getSpawnTree(input: GetSpawnTreeInput): Promise<GetSpawnTreeOutput>;
  validateSpawnRequest(
    input: ValidateSpawnRequestInput
  ): Promise<SpawnValidationResult>;
  generateSpawnedSoulPrompt(
    input: GenerateSpawnedSoulPromptInput
  ): Promise<GenerateSpawnedSoulPromptOutput>;
  createSpawnedAgent(
    input: CreateSpawnedAgentInput
  ): Promise<CreateSpawnedAgentOutput>;
  routeAgentMessage(input: RouteMessageInput): Promise<RouteMessageOutput>;
  fetchAgentInbox(input: FetchInboxInput): Promise<FetchInboxOutput>;
  waitForAgentReply(
    input: WaitForReplyActivityInput
  ): Promise<WaitForReplyActivityOutput>;
  browseInbox(input: BrowseInboxInput): Promise<BrowseInboxOutput>;
  validateAgentClaim(
    input: ValidateAgentClaimInput
  ): Promise<ValidateAgentClaimOutput>;
  selectReviewer(input: SelectReviewerInput): Promise<SelectReviewerOutput>;
  checkReviewGating(
    input: CheckReviewGatingInput
  ): Promise<CheckReviewGatingOutput>;
}
