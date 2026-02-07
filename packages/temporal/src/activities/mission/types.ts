import type {
  MissionAgentRunInput,
  MissionAgentRunOutput,
} from "@openplane/types/temporal/mission";

export interface RefreshQueueInput {
  missionId: string;
}

export interface RefreshQueueOutput {
  tasks: Array<{
    id: string;
    title: string;
    priority: string;
    assigneeId: string | null;
  }>;
}

export interface PlanDispatchInput {
  missionId: string;
  pendingTasks: Array<{
    id: string;
    title: string;
    priority: string;
  }>;
  maxConcurrentRuns: number;
}

export interface DispatchPlan {
  agentId: string;
  agentName: string;
  taskId: string;
  taskTitle: string;
  soulPrompt: string;
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
}

export type { MissionAgentRunInput, MissionAgentRunOutput };
