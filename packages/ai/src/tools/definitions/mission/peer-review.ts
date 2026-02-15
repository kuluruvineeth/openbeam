import type { ToolExecutionResult } from "@openplane/types/ai";
import type {
  PeerReview,
  ReviewConsensus,
} from "@openplane/types/temporal/mission-reflection";
import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { getMissionContext } from "./memory";

export interface MissionPeerReviewServices {
  submitPeerReview: (input: {
    missionId: string;
    review: PeerReview;
  }) => Promise<void>;
  getPeerReviews: (input: { missionId: string; taskId: string }) => Promise<{
    reviews: PeerReview[];
    consensus: ReviewConsensus | null;
  }>;
  logActivity: (input: {
    missionId: string;
    type: string;
    message: string;
    agentId?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
}

let peerReviewServices: MissionPeerReviewServices | null = null;

export function setMissionPeerReviewServices(
  services: MissionPeerReviewServices
): void {
  peerReviewServices = services;
}

export const missionRequestPeerReview = defineTool({
  name: "mission_request_peer_review",
  description:
    "Request a peer review of your completed work from another agent. The reviewer will be automatically assigned based on capabilities.",
  category: "mission",
  deferLoading: true,
  searchKeywords: ["mission", "review", "peer", "request", "quality"],
  stakes: "medium",
  reversibility: "easy",
  allowedCallers: ["agent"],
  parameters: z.object({
    taskId: z.string().describe("Task to be reviewed"),
    artifactId: z.string().optional().describe("Specific artifact to review"),
    context: z
      .string()
      .max(1000)
      .optional()
      .describe("Context for the reviewer"),
  }),
  async execute(
    params,
    ctx
  ): Promise<ToolExecutionResult<{ requested: boolean }>> {
    if (!peerReviewServices) {
      return failure("INVALID_STATE", "Peer review services not initialized");
    }

    const mCtx = getMissionContext(ctx);

    await peerReviewServices.logActivity({
      missionId: mCtx.missionId,
      type: "peer_review_requested",
      message: `Agent ${mCtx.agentId} requested peer review for task ${params.taskId}`,
      agentId: mCtx.agentId,
      metadata: {
        taskId: params.taskId,
        artifactId: params.artifactId,
        context: params.context,
      },
    });

    return success({ requested: true });
  },
});

export const missionSubmitPeerReview = defineTool({
  name: "mission_submit_peer_review",
  description:
    "Submit a peer review for another agent's work. Provide a verdict (approve/revise/reject), quality score, and any issues found.",
  category: "mission",
  deferLoading: true,
  searchKeywords: [
    "mission",
    "review",
    "peer",
    "submit",
    "verdict",
    "approve",
    "reject",
  ],
  stakes: "high",
  reversibility: "hard",
  allowedCallers: ["agent"],
  parameters: z.object({
    taskId: z.string().describe("Task being reviewed"),
    artifactId: z.string().optional(),
    verdict: z.enum(["approve", "revise", "reject"]),
    qualityScore: z.number().min(0).max(1),
    issues: z
      .array(
        z.object({
          severity: z.enum(["blocking", "major", "minor"]),
          description: z.string(),
        })
      )
      .max(10),
    strengths: z.array(z.string()).max(5).optional(),
    suggestion: z.string().max(1000).optional(),
  }),
  async execute(
    params,
    ctx
  ): Promise<
    ToolExecutionResult<{
      submitted: boolean;
      consensus: ReviewConsensus | null;
    }>
  > {
    if (!peerReviewServices) {
      return failure("INVALID_STATE", "Peer review services not initialized");
    }

    const mCtx = getMissionContext(ctx);
    const reviewId = `review-${mCtx.agentId}-${Date.now()}`;

    const review: PeerReview = {
      reviewId,
      taskId: params.taskId,
      artifactId: params.artifactId,
      reviewerAgentId: mCtx.agentId,
      reviewerAgentName: mCtx.agentId,
      authorAgentId: "",
      verdict: params.verdict,
      qualityScore: params.qualityScore,
      issues: params.issues,
      strengths: params.strengths ?? [],
      suggestion: params.suggestion,
      timestamp: Date.now(),
    };

    await peerReviewServices.submitPeerReview({
      missionId: mCtx.missionId,
      review,
    });

    const { consensus } = await peerReviewServices.getPeerReviews({
      missionId: mCtx.missionId,
      taskId: params.taskId,
    });

    await peerReviewServices.logActivity({
      missionId: mCtx.missionId,
      type: "peer_review_submitted",
      message: `Agent ${mCtx.agentId} reviewed task ${params.taskId}: ${params.verdict} (score: ${params.qualityScore.toFixed(2)})`,
      agentId: mCtx.agentId,
      metadata: {
        taskId: params.taskId,
        reviewId,
        verdict: params.verdict,
        qualityScore: params.qualityScore,
        issueCount: params.issues.length,
        hasConsensus: consensus !== null,
        consensusVerdict: consensus?.finalVerdict,
      },
    });

    return success({ submitted: true, consensus });
  },
});
