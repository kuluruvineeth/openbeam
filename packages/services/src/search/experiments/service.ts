import prisma, {
  getActiveExperiment,
  getUserSearchProfile,
  recordSearchClick,
  recordSearchImpression,
  upsertUserSearchProfile,
} from "@openbeam/db";
import type { UserContext } from "../ltr/types";
import type {
  HybridSearchRequest,
  HybridSearchResponse,
  RRFConfig,
  SearchMode,
} from "../types";

export interface LTRConfig {
  enabled: boolean;
  modelVersion?: string;
}

export interface ExperimentVariant {
  name: "control" | "treatment";
  rrfConfig: RRFConfig;
  searchMode?: SearchMode;
  ltrConfig?: LTRConfig;
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
    const config = isControl
      ? (experiment.controlConfig as Record<string, unknown>)
      : (experiment.treatmentConfig as Record<string, unknown>);

    return {
      name: isControl ? "control" : "treatment",
      rrfConfig: (config.rrfConfig as RRFConfig) ?? {},
      searchMode: config.searchMode as SearchMode | undefined,
      ltrConfig: config.ltrConfig as LTRConfig | undefined,
    };
  }

  async getUserContext(
    userId: string,
    teamId: string
  ): Promise<UserContext | null> {
    const profile = await getUserSearchProfile(prisma, userId, teamId);
    if (!profile) {
      return null;
    }

    return {
      userId: profile.userId,
      teamId: profile.teamId,
      department: profile.department ?? undefined,
      searchCount: profile.searchCount,
      clickCount: profile.clickCount,
      avgDwellMs: profile.avgDwellMs ?? undefined,
      connectorWeights:
        (profile.connectorWeights as Record<string, number>) ?? {},
      authorInteractions:
        (profile.authorInteractions as Record<string, number>) ?? {},
    };
  }

  async updateUserProfile(
    userId: string,
    teamId: string,
    clickedDocConnector?: string
  ): Promise<void> {
    const profile = await getUserSearchProfile(prisma, userId, teamId);

    const newSearchCount = (profile?.searchCount ?? 0) + 1;
    const newClickCount = profile?.clickCount ?? 0;

    const connectorWeights =
      (profile?.connectorWeights as Record<string, number>) ?? {};
    if (clickedDocConnector) {
      connectorWeights[clickedDocConnector] =
        (connectorWeights[clickedDocConnector] ?? 0) + 1;
    }

    await upsertUserSearchProfile(prisma, {
      userId,
      teamId,
      searchCount: newSearchCount,
      clickCount: newClickCount,
      connectorWeights,
    });
  }

  async recordImpression(
    request: HybridSearchRequest,
    response: HybridSearchResponse
  ): Promise<string> {
    const impression = await recordSearchImpression(prisma, {
      teamId: request.teamId,
      userId: request.userId ?? "anonymous",
      experimentId: request.experimentId ?? null,
      variant: response.metadata.experimentId ? "experiment" : null,
      query: request.query,
      resultDocIds: response.documents.map((d) => d.document.id),
      timing: { ...response.timing },
      rrfConfig: request.rrfConfig ?? null,
    });
    return impression.id;
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
}

export const experimentService = new ExperimentService();
