import type {
  CriticReview,
  EscalationRequest,
  MissionHealthSnapshot,
  PeerReview,
  ReflectionEntry,
  ReplanRequest,
  ReplanResult,
  ReviewConsensus,
  StandupReport,
  StandupSummary,
  StepEvaluation,
} from "@openplane/types/temporal/mission-reflection";
import type { AgentArtifact } from "../../workflows/types";

export interface EvaluateProgressInput {
  missionId: string;
  taskId: string;
  agentId: string;
  currentStep: number;
  maxSteps: number;
  recentArtifacts: AgentArtifact[];
  reflectionBuffer: ReflectionEntry[];
  taskContext: {
    title: string;
    description: string | null;
  };
}

export interface GenerateReplanInput extends ReplanRequest {}

export interface CriticReviewInput {
  missionId: string;
  taskId: string;
  agentId: string;
  artifacts: AgentArtifact[];
  taskContext: {
    title: string;
    description: string | null;
  };
}

export interface EscalateInput extends EscalationRequest {}

export interface CheckMissionHealthInput {
  missionId: string;
}

export interface NotifyDependencyFailureInput {
  missionId: string;
  failedTaskId: string;
  failedTaskTitle: string;
  reason: string;
}

export interface NotifyDependencyFailureOutput {
  notifiedTaskIds: string[];
  adaptedTaskIds: string[];
}

export interface SubmitPeerReviewInput {
  missionId: string;
  review: PeerReview;
}

export interface GetPeerReviewsInput {
  missionId: string;
  taskId: string;
}

export interface GetPeerReviewsOutput {
  reviews: PeerReview[];
  consensus: ReviewConsensus | null;
}

export interface SynthesizeStandupInput {
  missionId: string;
  roundId: string;
  reports: StandupReport[];
  missedAgentIds: string[];
  missionObjective: string;
}

export interface SynthesizeStandupOutput {
  summary: StandupSummary;
}

export interface ReflectionActivities {
  evaluateProgress(input: EvaluateProgressInput): Promise<StepEvaluation>;
  generateReplan(input: GenerateReplanInput): Promise<ReplanResult>;
  criticReview(input: CriticReviewInput): Promise<CriticReview>;
  escalate(input: EscalateInput): Promise<void>;
  checkMissionHealth(
    input: CheckMissionHealthInput
  ): Promise<MissionHealthSnapshot>;
  notifyDependencyFailure(
    input: NotifyDependencyFailureInput
  ): Promise<NotifyDependencyFailureOutput>;
  submitPeerReview(input: SubmitPeerReviewInput): Promise<void>;
  getPeerReviews(input: GetPeerReviewsInput): Promise<GetPeerReviewsOutput>;
  synthesizeStandup(
    input: SynthesizeStandupInput
  ): Promise<SynthesizeStandupOutput>;
}
