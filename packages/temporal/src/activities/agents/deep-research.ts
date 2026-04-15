import type { Database } from "@openbeam/db";
import {
  addResearchEvidenceBatch,
  createResearchSession,
  updateResearchSession,
} from "@openbeam/db";

export interface DeepResearchDependencies {
  db: Database;
}

export interface DeepResearchInput {
  teamId: string;
  userId: string;
  prompt: string;
  sessionId: string;
  maxSteps?: number;
}

export function createDeepResearchActivities(deps: DeepResearchDependencies) {
  return {
    async initializeSession(input: DeepResearchInput): Promise<string> {
      const session = await createResearchSession(deps.db, {
        id: input.sessionId,
        teamId: input.teamId,
        userId: input.userId,
        prompt: input.prompt,
        status: "PLANNING",
      });
      return session.id;
    },

    async updateProgress(options: {
      sessionId: string;
      status: "PLANNING" | "INVESTIGATING" | "SYNTHESIZING" | "WRITING";
      progress: number;
      plan?: unknown;
    }): Promise<void> {
      await updateResearchSession(deps.db, options.sessionId, {
        status: options.status,
        progress: options.progress,
        plan: options.plan as undefined,
      });
    },

    async saveReport(options: {
      sessionId: string;
      report: string;
      tokenUsage?: unknown;
    }): Promise<void> {
      await updateResearchSession(deps.db, options.sessionId, {
        status: "COMPLETED",
        progress: 100,
        report: options.report,
        tokenUsage: options.tokenUsage as undefined,
      });
    },

    async saveEvidence(options: {
      sessionId: string;
      sources: Array<{
        sourceUri: string;
        title: string;
        snippet: string;
        relevance: number;
        connector?: string;
      }>;
    }): Promise<void> {
      if (options.sources.length === 0) {
        return;
      }
      await addResearchEvidenceBatch(
        deps.db,
        options.sources.map((s) => ({
          sessionId: options.sessionId,
          ...s,
        }))
      );
    },

    async markFailed(options: {
      sessionId: string;
      error: string;
    }): Promise<void> {
      await updateResearchSession(deps.db, options.sessionId, {
        status: "FAILED",
        error: options.error,
      });
    },

    async markCancelled(sessionId: string): Promise<void> {
      await updateResearchSession(deps.db, sessionId, {
        status: "CANCELLED",
      });
    },
  };
}
