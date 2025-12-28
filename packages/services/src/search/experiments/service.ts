import prisma, {
  getActiveExperiment,
  recordSearchClick,
  recordSearchImpression,
} from "@openplane/db";
import type {
  HybridSearchRequest,
  HybridSearchResponse,
  RRFConfig,
} from "../types";

export interface ExperimentVariant {
  name: "control" | "treatment";
  rrfConfig: RRFConfig;
}

export interface ClickData {
  impressionId: string;
  docId: string;
  position: number;
  dwellTimeMs?: number;
  feedbackType?: string;
}

export class ExperimentService {
  async getVariant(
    teamId: string,
    userId: string
  ): Promise<ExperimentVariant | null> {
    const experiment = await getActiveExperiment(prisma, teamId);
    if (!experiment) {
      return null;
    }

    const bucket = this.hashToBucket(userId, experiment.id);
    if (bucket > experiment.trafficPercent) {
      return null;
    }

    const isControl = bucket <= experiment.trafficPercent / 2;

    return {
      name: isControl ? "control" : "treatment",
      rrfConfig: isControl
        ? (experiment.controlConfig as RRFConfig)
        : (experiment.treatmentConfig as RRFConfig),
    };
  }

  recordImpression(
    request: HybridSearchRequest,
    response: HybridSearchResponse
  ): Promise<string> {
    return recordSearchImpression(prisma, {
      teamId: request.teamId,
      userId: request.userId ?? "anonymous",
      experimentId: request.experimentId ?? null,
      variant: response.metadata.experimentId ? "experiment" : null,
      query: request.query,
      queryHash: this.hashQuery(request.query),
      resultDocIds: response.documents.map((d) => d.document.id),
      timing: { ...response.timing },
      rrfConfig: request.rrfConfig ?? null,
    });
  }

  async recordClick(data: ClickData): Promise<void> {
    await recordSearchClick(prisma, {
      impressionId: data.impressionId,
      docId: data.docId,
      position: data.position,
      dwellTimeMs: data.dwellTimeMs ?? null,
      feedbackType: data.feedbackType ?? null,
    });
  }

  private hashToBucket(userId: string, experimentId: string): number {
    const str = `${userId}:${experimentId}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      // biome-ignore lint/suspicious/noBitwiseOperators: intentional hash function
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % 100;
  }

  private hashQuery(query: string): string {
    const normalized = query.toLowerCase().trim().replace(/\s+/g, " ");
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      // biome-ignore lint/suspicious/noBitwiseOperators: intentional hash function
      hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16);
  }
}

export const experimentService = new ExperimentService();
