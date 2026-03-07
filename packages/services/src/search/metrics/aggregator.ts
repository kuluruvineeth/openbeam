import prisma, { getSearchClicks, getSearchImpressions } from "@openbeam/db";
import {
  calculateMetrics,
  type ImpressionData,
  type SearchMetrics,
} from "./calculator";

export interface ExperimentMetrics {
  control: SearchMetrics;
  treatment: SearchMetrics;
  improvement: {
    mrr: number;
    ndcg: number;
    ctr: number;
    avgDwellTime: number;
  };
  sampleSize: {
    control: number;
    treatment: number;
  };
}

export async function aggregateExperimentMetrics(
  experimentId: string,
  fromDate: Date,
  toDate: Date
): Promise<ExperimentMetrics> {
  const impressions = await getSearchImpressions(prisma, {
    teamId: "",
    fromDate,
    toDate,
    experimentId,
  });

  const impressionIds = impressions.map((i) => i.id);
  const clicks = await getSearchClicks(prisma, impressionIds);

  const clicksByImpression = new Map<
    string,
    Array<{ docId: string; position: number; dwellTimeMs: number | null }>
  >();
  for (const click of clicks) {
    const arr = clicksByImpression.get(click.impressionId) ?? [];
    arr.push({
      docId: click.docId,
      position: click.position,
      dwellTimeMs: click.dwellTimeMs,
    });
    clicksByImpression.set(click.impressionId, arr);
  }

  const controlData: ImpressionData[] = [];
  const treatmentData: ImpressionData[] = [];

  for (const impression of impressions) {
    const data: ImpressionData = {
      resultDocIds: impression.resultDocIds,
      clicks: clicksByImpression.get(impression.id) ?? [],
    };

    if (impression.variant === "control") {
      controlData.push(data);
    } else if (impression.variant === "treatment") {
      treatmentData.push(data);
    }
  }

  const controlMetrics = calculateMetrics(controlData);
  const treatmentMetrics = calculateMetrics(treatmentData);

  const improvement = (treat: number, control: number) =>
    control === 0 ? 0 : ((treat - control) / control) * 100;

  return {
    control: controlMetrics,
    treatment: treatmentMetrics,
    improvement: {
      mrr: improvement(treatmentMetrics.mrr, controlMetrics.mrr),
      ndcg: improvement(treatmentMetrics.ndcg, controlMetrics.ndcg),
      ctr: improvement(treatmentMetrics.ctr, controlMetrics.ctr),
      avgDwellTime: improvement(
        treatmentMetrics.avgDwellTime,
        controlMetrics.avgDwellTime
      ),
    },
    sampleSize: {
      control: controlData.length,
      treatment: treatmentData.length,
    },
  };
}
